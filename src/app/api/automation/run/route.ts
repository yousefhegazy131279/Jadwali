import {timingSafeEqual} from 'node:crypto'
import {runNotifications} from '@/lib/notificationDelivery'
export const runtime='nodejs'
export const maxDuration=60
async function handle(request:Request){
 const secret=process.env.CRON_SECRET
 if(!secret||secret.length<32)return Response.json({error:'Scheduler is not configured'},{status:503})
 const supplied=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret)
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return Response.json({error:'Unauthorized'},{status:401})
 try{return Response.json(await runNotifications(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Notification job failed; no delivery success is assumed'},{status:503})}
}
export async function POST(request:Request){return handle(request)}
export async function GET(request:Request){return handle(request)}
