// Cron-only worker. Keep gateway JWT verification OFF and validate the dedicated secret here.
import {createClient} from 'npm:@supabase/supabase-js@2.112.3'
import webpush from 'npm:web-push@3.6.7'
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}})
async function equalSecret(a:string,b:string){const enc=new TextEncoder();const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);const left=new Uint8Array(x),right=new Uint8Array(y);let mismatch=0;for(let i=0;i<left.length;i++)mismatch|=left[i]^right[i];return mismatch===0}
function allowedEndpoint(value:string){try{const url=new URL(value);return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&(url.hostname==='fcm.googleapis.com'||url.hostname==='web.push.apple.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname.endsWith('.notify.windows.com'))}catch{return false}}
Deno.serve(async(request:Request)=>{
 if(request.method!=='POST')return json({error:'Method not allowed'},405)
 const secret=Deno.env.get('CRON_SECRET')||''
 if(secret.length<32)return json({error:'Worker is not configured'},503)
 if(!await equalSecret(request.headers.get('x-jadwali-cron-secret')||'',secret))return json({error:'Unauthorized'},401)
 const url=Deno.env.get('SUPABASE_URL'),serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
 const publicKey=Deno.env.get('VAPID_PUBLIC_KEY'),privateKey=Deno.env.get('VAPID_PRIVATE_KEY'),subject=Deno.env.get('VAPID_SUBJECT')
 if(!url||!serviceKey)return json({error:'Backend is unavailable'},503)
 const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}})
 try{
  const configured=!!(publicKey&&privateKey&&subject)
  if(configured)webpush.setVapidDetails(subject!,publicKey!,privateKey!)
  const start=await client.from('productivity_job_runs').insert({}).select('id').single();if(start.error)throw start.error
  const enqueue=await client.rpc('enqueue_productivity_jobs');if(enqueue.error)throw enqueue.error
  const claimed=await client.rpc('claim_productivity_deliveries',{p_limit:12});if(claimed.error)throw claimed.error
  let delivered=0,failed=0
  for(let i=0;i<claimed.data.length;i+=4)await Promise.all(claimed.data.slice(i,i+4).map(async(job:Record<string,unknown>)=>{
   let status=String(job.push_status),error:string|null=null
   const update:Record<string,unknown>={lease_until:null}
   if(['pending','failed'].includes(status)){
    const subs=await client.from('push_subscriptions').select('id,endpoint,keys').eq('user_id',job.user_id).limit(10)
    if(subs.error){status='failed';error='push_storage_unavailable'}
    else if(!subs.data?.length)status='skipped'
    else if(!configured){status='failed';error='push_not_configured'}
    else{
     const outcomes=await Promise.all(subs.data.map(async(sub:{id:string;endpoint:string;keys:{p256dh:string;auth:string}})=>{
      if(!allowedEndpoint(sub.endpoint))return false
      try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({id:job.id,title:job.title,body:job.body,url:job.url}),{TTL:3600,timeout:8000});return true}catch(e){const code=typeof e==='object'&&e&&'statusCode'in e?Number(e.statusCode):0;if(code===404||code===410){await client.from('push_subscriptions').delete().eq('id',sub.id);return true}return false}
     }))
     status=outcomes.every(Boolean)?'sent':'failed';if(status==='sent')update.push_sent_at=new Date().toISOString();else error='push_delivery_failed'
    }
   }
   // Email activation is intentionally deferred. No recipient mail is sent by this worker.
   update.push_status=status;update.last_error=error
   const write=await client.from('productivity_notifications').update(update).eq('id',job.id)
   if(error||write.error)failed++;else delivered++
  }))
  await client.from('productivity_job_runs').update({finished_at:new Date().toISOString(),enqueued:Number(enqueue.data)||0,delivered,failed}).eq('id',start.data.id)
  await client.from('productivity_runtime').update({vapid_public_key:publicKey||null,push_enabled:configured,last_dispatch:new Date().toISOString()}).eq('id',true)
  return json({ok:true,enqueued:enqueue.data,delivered,failed,push_configured:configured})
 }catch{return json({error:'Dispatch failed; inspect server logs and database job status'},503)}
})
