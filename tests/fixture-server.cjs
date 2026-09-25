// Local-only UI fixtures. SQL authorization is tested separately against PostgreSQL.
// Never imported by the application; never connects to production or OpenAI.
const http = require('node:http')
const { randomUUID } = require('node:crypto')
const owner='00000000-0000-0000-0000-000000000001',guest='00000000-0000-0000-0000-000000000002'
const schedule='10000000-0000-0000-0000-000000000001'
const users=[owner,guest].map((id,i)=>({id,email:i?'guest@example.test':'owner@example.test',role:'authenticated',aud:'authenticated',user_metadata:{full_name:i?'Guest QA':'Owner QA'},app_metadata:{provider:'email'},created_at:new Date().toISOString()}))
const tables={
 profiles:users.map((u,i)=>({id:u.id,email:u.email,full_name:u.user_metadata.full_name,role:i?'user':'admin',onboarding_completed:false,created_at:u.created_at})),
 schedules:[{id:schedule,user_id:owner,title:'QA focus schedule',day:new Date().toISOString().slice(0,10),start_time:'09:00',pomodoro:{workDuration:1,shortBreak:1,longBreak:1,cyclesBeforeLong:4},is_shared:false,project_id:null,created_at:new Date().toISOString()}],
 tasks:[{id:'20000000-0000-0000-0000-000000000001',schedule_id:schedule,user_id:owner,name:'Read one page',category:'Study',duration:1,type:'task',priority:'high',done:false,completed_sessions:0,created_at:new Date().toISOString()}],
 settings:[],projects:[],prayers:[],custom_cards:[],notifications:[],notes:[],task_progress:[],
 schedule_members:[{schedule_id:schedule,user_id:owner,role:'owner'}],
}
const token=u=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:u.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,session_id:randomUUID()})).toString('base64url')+'.local-fixture'
const byToken=req=>{try{return users.find(u=>u.id===JSON.parse(Buffer.from(req.headers.authorization.split('.')[1],'base64url')).sub)}catch{return null}}
const session=u=>({access_token:token(u),refresh_token:u.id,token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:u})
function filterRows(rows,params){return rows.filter(row=>[...params].every(([key,value])=>{
 if(['select','order','limit','offset','on_conflict'].includes(key))return true
 const [op,...parts]=value.split('.'),v=parts.join('.')
 if(op==='eq')return String(row[key])===v
 if(op==='neq')return String(row[key])!==v
 if(op==='is')return v==='null'?row[key]==null:String(row[key])===v
 if(op==='gte')return row[key]>=v
 if(op==='in')return v.slice(1,-1).split(',').includes(String(row[key]))
 return true
}))}
http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin',req.headers.origin||'*');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,prefer,range,x-supabase-api-version');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'*');res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','Content-Range')
 const reply=(value,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))}
 if(req.method==='OPTIONS')return reply({})
 const url=new URL(req.url,'http://localhost:54329');let raw='';for await(const chunk of req)raw+=chunk;let body={};try{body=raw?JSON.parse(raw):{}}catch{return reply({message:'Invalid JSON'},400)}
 let user=byToken(req); console.log(req.method,url.pathname,user?.email??'anonymous')
 if(url.pathname==='/auth/v1/token'){user=users.find(u=>u.email===body.email||u.id===body.refresh_token);return user?reply(session(user)):reply({message:'Invalid test account'},400)}
 if(url.pathname==='/auth/v1/user'){if(!user)return reply({message:'Sign in required'},401);if(req.method==='PUT')Object.assign(user.user_metadata,body.data);return reply(user)}
 if(url.pathname==='/auth/v1/logout')return reply({})
 if(url.pathname==='/functions/v1/generate-schedule')return reply({draft:{title:'Suggested study day',date:body.date,start_time:'20:00',tasks:[{name:'Practice math',category:'Study',duration_minutes:60}]}})
 if(!user)return reply({message:'Sign in required'},401)
 if(url.pathname.startsWith('/rest/v1/rpc/')){
   const rpc=url.pathname.split('/').pop()
   if(rpc==='schedule_member_progress')return reply(tables.schedule_members.filter(m=>m.schedule_id===body.p_schedule_id).map(m=>({...m,full_name:tables.profiles.find(p=>p.id===m.user_id)?.full_name,sessions:tables.task_progress.filter(p=>p.user_id===m.user_id).length,minutes:tables.task_progress.filter(p=>p.user_id===m.user_id).reduce((n,p)=>n+p.duration_minutes,0)})))
   if(rpc==='share_schedule'){const target=users.find(u=>u.email===body.p_email);if(!target)return reply({message:'Unknown user'},400);const old=tables.schedule_members.find(m=>m.schedule_id===body.p_schedule_id&&m.user_id===target.id);if(old)old.role=body.p_role;else tables.schedule_members.push({schedule_id:body.p_schedule_id,user_id:target.id,role:body.p_role});tables.schedules.find(s=>s.id===body.p_schedule_id).is_shared=true;return reply(null)}
   if(rpc==='remove_schedule_member'){tables.schedule_members=tables.schedule_members.filter(m=>m.user_id!==body.p_user_id||m.schedule_id!==body.p_schedule_id);return reply(null)}
   if(rpc==='record_work_session'){const task=tables.tasks.find(t=>t.id===body.p_task_id);if(task.completed_sessions<body.p_session_number){task.completed_sessions=body.p_session_number;task.done=true;tables.task_progress.push({task_id:task.id,user_id:user.id,session_number:body.p_session_number,duration_minutes:1,completed_at:new Date().toISOString()})}return reply(task.completed_sessions)}
   return reply(null)
 }
 const table=url.pathname.split('/').pop();if(!tables[table])return reply({message:'Unknown table'},404)
 let rows=filterRows(tables[table],url.searchParams)
 if(req.method==='POST'){
   rows=(Array.isArray(body)?body:[body]).map(item=>{
     const existing=tables[table].find(row=>item.id&&row.id===item.id)
     if(existing&&req.headers.prefer?.includes('resolution=merge-duplicates')){Object.assign(existing,item);return existing}
     const row={id:randomUUID(),created_at:new Date().toISOString(),...item};tables[table].push(row);return row
   })
 }else if(req.method==='PATCH'){rows.forEach(row=>Object.assign(row,body))}
 else if(req.method==='DELETE'){tables[table]=tables[table].filter(row=>!rows.includes(row))}
 let result=rows.map(row=>({...row}))
 if(url.searchParams.get('select')?.includes('tasks('))result=result.map(row=>({...row,tasks:tables.tasks.filter(t=>t.schedule_id===row.id)}))
 res.setHeader('Content-Range',`0-${Math.max(0,result.length-1)}/${result.length}`)
 if(req.method==='HEAD'){res.statusCode=200;return res.end()}
 if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return result.length===1?reply(result[0]):reply({code:'PGRST116',message:'No rows'},406)
 reply(result,req.method==='POST'?201:200)
}).listen(54329,'127.0.0.1',()=>console.log('Local QA fixtures: http://127.0.0.1:54329 (owner@example.test / guest@example.test, any password)'))
