import {createClient} from '@/lib/supabase/server'
export async function GET(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser()
 let stored:{vapid_public_key?:string;push_enabled?:boolean;last_dispatch?:string}|null=null;let scheduler=false
 if(user){const [runtime,status]=await Promise.all([supabase.from('productivity_runtime').select('vapid_public_key,push_enabled,last_dispatch').eq('id',true).maybeSingle(),supabase.rpc('scheduler_status')]);stored=runtime.data;scheduler=!!status.data?.inapp}
 const key=stored?.vapid_public_key||process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY||null
 return Response.json({push:!!(stored?.push_enabled&&key)||!!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.VAPID_SUBJECT),publicKey:key,email:!!(process.env.RESEND_API_KEY&&process.env.REPORT_FROM_EMAIL),scheduler,lastDispatch:stored?.last_dispatch||null},{headers:{'Cache-Control':'no-store'}})
}
