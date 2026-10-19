import {createClient} from '@/lib/supabase/server'
import {validPushEndpoint} from '@/lib/productivity'
async function handle(request:Request,remove=false){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin not allowed'},{status:403})
 const supabase=await createClient();const {data,error}=await supabase.auth.getUser();if(error||!data.user)return Response.json({error:'Sign in required'},{status:401})
 if(Number(request.headers.get('content-length')||0)>5000)return Response.json({error:'Request too large'},{status:413})
 let input;try{const text=await request.text();if(text.length>5000)throw new Error('Too large');input=JSON.parse(text)}catch{return Response.json({error:'Invalid body'},{status:400})}
 if(typeof input.endpoint!=='string'||input.endpoint.length>2048||!validPushEndpoint(input.endpoint))return Response.json({error:'Invalid push endpoint'},{status:400})
 if(remove){const r=await supabase.from('push_subscriptions').delete().eq('user_id',data.user.id).eq('endpoint',input.endpoint);return Response.json({ok:!r.error},{status:r.error?400:200})}
 const keys=input.keys
 if(!keys||typeof keys.p256dh!=='string'||typeof keys.auth!=='string'||!/^[-_A-Za-z0-9]{80,100}={0,2}$/.test(keys.p256dh)||!/^[-_A-Za-z0-9]{20,30}={0,2}$/.test(keys.auth))return Response.json({error:'Invalid push keys'},{status:400})
 const count=await supabase.from('push_subscriptions').select('id',{count:'exact',head:true}).eq('user_id',data.user.id)
 if(count.error)return Response.json({error:'Subscription storage unavailable'},{status:503})
 const existing=await supabase.from('push_subscriptions').select('id').eq('user_id',data.user.id).eq('endpoint',input.endpoint).maybeSingle()
 if(!existing.data&&(count.count||0)>=10)return Response.json({error:'Device limit reached'},{status:429})
 const r=await supabase.from('push_subscriptions').upsert({user_id:data.user.id,endpoint:input.endpoint,keys:{p256dh:keys.p256dh,auth:keys.auth}},{onConflict:'endpoint'})
 return Response.json({ok:!r.error},{status:r.error?400:200})
}
export async function POST(request:Request){return handle(request)}
export async function DELETE(request:Request){return handle(request,true)}
