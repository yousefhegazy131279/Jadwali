import 'server-only'
import webpush from 'web-push'
import {createClient} from '@supabase/supabase-js'
import {escapeHtml,validPushEndpoint,type WeeklyReport} from '@/lib/productivity'
export function serviceClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('Notification backend is not configured')
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
}
type Job={id:string;user_id:string;dedupe_key:string;title:string;body:string;url:string;metadata:WeeklyReport;push_status:string;email_status:string}
export async function runNotifications(){
 const client=serviceClient();const run=await client.from('productivity_job_runs').insert({}).select('id').single();if(run.error)throw new Error('Job log unavailable')
 const enqueued=await client.rpc('enqueue_productivity_jobs');if(enqueued.error)throw new Error('Could not enqueue reminders')
 const claimed=await client.rpc('claim_productivity_deliveries',{p_limit:20});if(claimed.error)throw new Error('Could not claim deliveries')
 const readyPush=!!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT)
 if(readyPush)webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!)
 let delivered=0,failed=0
 const jobs=claimed.data as Job[]
 async function deliver(job:Job){
  let pushStatus=job.push_status,emailStatus=job.email_status;let error:string|null=null
  const patch:Record<string,unknown>={lease_until:null}
  if(['pending','failed'].includes(pushStatus)){
   const subs=await client.from('push_subscriptions').select('id,endpoint,keys').eq('user_id',job.user_id).limit(10)
   if(subs.error){pushStatus='failed';error='push_storage_unavailable'}
   else if(!subs.data?.length)pushStatus='skipped'
   else if(!readyPush){pushStatus='failed';error='push_not_configured'}
   else{
    const outcomes=await Promise.all(subs.data.map(async sub=>{
     if(!validPushEndpoint(sub.endpoint))return false
     try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({id:job.id,title:job.title,body:job.body,url:job.url}),{TTL:3600,timeout:8000});return true}
     catch(e){const status=typeof e==='object'&&e&&'statusCode'in e?Number(e.statusCode):0;if(status===404||status===410){await client.from('push_subscriptions').delete().eq('id',sub.id);return true}return false}
    }))
    pushStatus=outcomes.every(Boolean)?'sent':'failed';if(pushStatus==='sent')patch.push_sent_at=new Date().toISOString();else error='push_delivery_failed'
   }
  }
  if(['pending','failed'].includes(emailStatus)){
   const prefs=await client.from('productivity_preferences').select('weekly_email').eq('user_id',job.user_id).maybeSingle()
   if(!prefs.data?.weekly_email)emailStatus='skipped'
   else if(!process.env.RESEND_API_KEY||!process.env.REPORT_FROM_EMAIL){emailStatus='failed';error='email_not_configured'}
   else{
    const auth=await client.auth.admin.getUserById(job.user_id);const email=auth.data.user?.email
    if(!email||!auth.data.user?.email_confirmed_at){emailStatus='skipped'}
    else{
     const report=job.metadata;const html=`<div dir="rtl" style="font-family:Tahoma,Arial;line-height:1.9"><h1>تقرير أسبوعك في جَدْوَلِي</h1><p>الأسبوع الذي بدأ في ${escapeHtml(String(report.week_start||''))}</p><p>جلسات التركيز: ${Number(report.sessions)||0}</p><p>ساعات التركيز: ${((Number(report.minutes)||0)/60).toFixed(1)}</p><p>أيام نشطة: ${Number(report.active_days)||0}</p><p>المهام المنجزة: ${Number(report.tasks_done)||0} / ${Number(report.tasks_total)||0}</p><p>أفضل يوم: ${escapeHtml(String(report.best_day||'—'))}</p><p><a href="https://jadwaly-hgz.vercel.app/dashboard/reports">افتح تقريرك</a></p><p>يمكنك إيقاف التقارير البريدية من إعدادات جَدْوَلِي.</p></div>`
     try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'jadwali-weekly-'+job.id},body:JSON.stringify({from:process.env.REPORT_FROM_EMAIL,to:[email],subject:job.title,html}),signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Provider rejected');emailStatus='sent';patch.email_sent_at=new Date().toISOString()}catch{emailStatus='failed';error='email_delivery_failed'}
    }
   }
  }
  patch.push_status=pushStatus;patch.email_status=emailStatus;patch.last_error=error
  const updated=await client.from('productivity_notifications').update(patch).eq('id',job.id)
  if(error||updated.error)failed++;else delivered++
 }
 // Bound execution time and connection use. Claim leases avoid concurrent workers processing the same batch.
 for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4).map(deliver))
 const result={enqueued:Number(enqueued.data)||0,delivered,failed,claimed:jobs.length}
 await client.from('productivity_job_runs').update({...result,claimed:undefined,finished_at:new Date().toISOString()}).eq('id',run.data.id)
 return result
}
