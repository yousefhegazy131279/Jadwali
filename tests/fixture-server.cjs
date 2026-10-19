// Isolated local Supabase-compatible test API. Never connects to production or accepts real credentials.
const http=require('node:http'),fs=require('node:fs'),crypto=require('node:crypto')
const OWNER='00000000-0000-0000-0000-000000000001',GUEST='00000000-0000-0000-0000-000000000002'
const SCHEDULE='10000000-0000-0000-0000-000000000001',PROJECT='30000000-0000-0000-0000-000000000001'
;(async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite()
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create table profiles(id uuid primary key,email text,full_name text,role text,avatar_url text,onboarding_completed boolean default true,created_at timestamptz default now());
 create function public.ensure_my_profile() returns void language plpgsql as $$begin if auth.uid() is null then raise exception 'Not signed in';end if;end$$;
 create table projects(id uuid primary key default gen_random_uuid(),user_id uuid,name text,color text default '#d4af37',created_at timestamptz default now());
 create table schedules(id uuid primary key default gen_random_uuid(),user_id uuid,title text,day date,start_time time,pomodoro jsonb,project_id uuid,created_at timestamptz default now(),is_shared boolean default false);
 create table tasks(id uuid primary key default gen_random_uuid(),user_id uuid,schedule_id uuid references schedules(id)on delete cascade,name text,category text,type text,duration integer,completed_sessions integer default 0,done boolean default false,priority text,created_at timestamptz default now(),"order" integer default 0,project_id uuid,due_date date,completed_by uuid);
 create table prayers(id uuid primary key default gen_random_uuid(),user_id uuid,schedule_id uuid,day date,name text,time time,done boolean default false);
 create table custom_cards(id uuid primary key,user_id uuid,schedule_id uuid,title text,content text);
 create table settings(id uuid primary key default gen_random_uuid(),user_id uuid unique,theme text default 'dark',primary_color text default '#d4af37',prayer_times jsonb default '["05:00","12:30","15:30","18:00","19:30"]',pomodoro jsonb default '{"workDuration":25,"shortBreak":5,"longBreak":15,"cyclesBeforeLong":4}',updated_at timestamptz default now());
 create table notifications(id uuid primary key default gen_random_uuid(),user_id uuid,title text,body text,type text,read boolean default false,created_at timestamptz default now());
 create table notes(id uuid primary key default gen_random_uuid(),user_id uuid not null,content text,updated_at timestamptz default now());
 grant usage on schema public,auth to authenticated;grant select,insert,update,delete on all tables in schema public to authenticated;
 insert into auth.users values('${OWNER}','demo@jadwali.test','{"full_name":"مستخدم تجريبي"}'),('${GUEST}','guest@jadwali.test','{"full_name":"صديق تجريبي"}');`)
 for(const file of ['202609240001_critical_fixes.sql','202609240002_collaboration_projects.sql','202610050002_atomic_schedule_creation.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'))
 await db.exec(fs.readFileSync('supabase/migrations/20261019033549_productivity_v2_foundation.sql','utf8'))
 await db.exec(fs.readFileSync('supabase/migrations/20261019040249_productivity_v2_scheduler.sql','utf8').split('-- Hosted extensions')[0]+'\ncommit;')
 await db.exec(fs.readFileSync('supabase/migrations/20261019044104_productivity_v2_template_prayers.sql','utf8'))
 await db.exec(fs.readFileSync('supabase/migrations/20261019050228_geographic_prayer_templates.sql','utf8'))
 await db.exec(`insert into projects(id,user_id,name)values('${PROJECT}','${OWNER}','الاستعداد للامتحان');insert into schedules(id,user_id,title,day,start_time,pomodoro,project_id)values('${SCHEDULE}','${OWNER}','خطة مذاكرة الرياضيات',current_date,'17:00','{"workDuration":25,"shortBreak":5,"longBreak":15,"cyclesBeforeLong":4}','${PROJECT}');insert into tasks(id,user_id,schedule_id,name,category,type,duration,"order")values('20000000-0000-0000-0000-000000000001','${OWNER}','${SCHEDULE}','مذاكرة الرياضيات','دراسة','task',60,0),('20000000-0000-0000-0000-000000000002','${OWNER}','${SCHEDULE}','قراءة القرآن','جانبي','side',0,1);insert into settings(user_id)values('${OWNER}');insert into notes(user_id,content)values('${OWNER}','ملاحظة قديمة محفوظة قبل الإصدار الجديد');`)
 const columns={};for(const r of (await db.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows)(columns[r.table_name]??=new Set()).add(r.column_name)
 const users={};for(const id of [OWNER,GUEST])users[id]={id,aud:'authenticated',role:'authenticated',email:id===OWNER?'demo@jadwali.test':'guest@jadwali.test',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:id===OWNER?'مستخدم تجريبي':'صديق تجريبي'}}
 const token=id=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',email:users[id].email,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})).toString('base64url')+'.local-fixture-only'
 const quote=id=>'"'+id.replaceAll('"','""')+'"'
 const body=async req=>{let text='';for await(const chunk of req){text+=chunk;if(text.length>100000)throw new Error('Too big')}return text?JSON.parse(text):{}}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin',['http://localhost:3120','http://localhost:3121'].includes(req.headers.origin)?req.headers.origin:'http://localhost:3121');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type,x-client-info,prefer,range,accept-profile,content-profile');res.setHeader('Access-Control-Allow-Methods','GET,HEAD,POST,PATCH,DELETE,OPTIONS');res.setHeader('Access-Control-Expose-Headers','content-range')
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(req.method==='HEAD'?undefined:JSON.stringify(value,function(k,v){return ['day','due_date','starts_on','ends_on','week_start'].includes(k)&&typeof v==='string'?v.slice(0,10):v}))}
  try{
   const url=new URL(req.url,'http://127.0.0.1:54399');let uid
   try{uid=JSON.parse(Buffer.from((req.headers.authorization||'').replace(/^Bearer /,'').split('.')[1],'base64url').toString()).sub}catch{}
   if(url.pathname==='/auth/v1/token'){
    const input=await body(req);const id=input.email==='guest@jadwali.test'?GUEST:OWNER
    if(!['demo@jadwali.test','guest@jadwali.test'].includes(input.email)||input.password!=='Fixture-only-2026!')return send(400,{error:'Invalid fixture credentials'})
    return send(200,{access_token:token(id),token_type:'bearer',expires_in:86400,expires_at:Math.floor(Date.now()/1000)+86400,refresh_token:'fixture-refresh-'+id,user:users[id]})
   }
   if(url.pathname==='/auth/v1/user')return users[uid]?send(200,users[uid]):send(401,{message:'Not signed in'})
   if(url.pathname==='/auth/v1/logout')return send(200,{})
   if(url.pathname==='/auth/v1/settings')return send(200,{external:{google:false},disable_signup:false})
   if(!users[uid])return send(401,{message:'Fixture sign in required'})
   const result=await db.transaction(async tx=>{
    await tx.exec(`set local request.jwt.claim.sub='${uid}';set local role authenticated`)
    if(url.pathname.startsWith('/rest/v1/rpc/')){
     const name=url.pathname.split('/').pop();if(!/^[a-z_]+$/.test(name))throw new Error('Invalid RPC')
     const input=await body(req),keys=Object.keys(input);if(keys.some(x=>!/^p_[a-z_]+$/.test(x)))throw new Error('Invalid parameter')
     const r=await tx.query(`select * from public.${quote(name)}(${keys.map((k,i)=>`${quote(k)}=>$${i+1}`).join(',')})`,keys.map(k=>typeof input[k]==='object'&&input[k]!==null?JSON.stringify(input[k]):input[k]))
     const singular=['refresh_productivity','create_challenge','join_challenge','create_focus_room','join_focus_room','save_note','server_now','generate_weekly_report','create_template_plan','record_work_session','finish_room_focus']
     return singular.includes(name)?r.rows[0]?.[name]:r.rows
    }
    const table=url.pathname.replace('/rest/v1/','');if(!columns[table])throw new Error('Missing fixture table '+table)
    const params=[],filters=[];const param=v=>{params.push(v);return '$'+params.length}
    for(const [key,value]of url.searchParams){if(!columns[table].has(key))continue;const match=value.match(/^(eq|neq|gte|gt|lte|lt|ilike|is|in)\.(.*)$/s);if(!match)continue;const [,op,v]=match;const field=quote(key);if(op==='is'){filters.push(field+(v==='null'?' is null':' is not null'))}else if(op==='in'){const vals=v.replace(/^\(|\)$/g,'').split(',');filters.push(field+' in ('+vals.map(x=>param(x.replace(/^"|"$/g,''))).join(',')+')')}else filters.push(field+' '+({eq:'=',neq:'<>',gte:'>=',gt:'>',lte:'<=',lt:'<',ilike:'ilike'}[op])+' '+param(v))}
    const where=filters.length?' where '+filters.join(' and '):''
    let rows
    if(req.method==='GET'||req.method==='HEAD'){
     const fields=(url.searchParams.get('select')||'*').split(',');const select=fields.every(x=>x==='*'||/^([a-z_]+:)?[a-z_]+$/.test(x))?fields.map(x=>x==='*'?'*':x.includes(':')?quote(x.split(':')[1])+' as '+quote(x.split(':')[0]):quote(x)).join(','):'*'
     const orders=(url.searchParams.get('order')||'').split(',').filter(Boolean).map(x=>{const [f,dir]=x.split('.');return columns[table].has(f)?quote(f)+(dir==='desc'?' desc':' asc'):null}).filter(Boolean)
     const total=await tx.query('select count(*)::int as n from '+quote(table)+where,params);res.setHeader('Content-Range',`0-${Math.max(0,total.rows[0].n-1)}/${total.rows[0].n}`)
     rows=(await tx.query('select '+select+' from '+quote(table)+where+(orders.length?' order by '+orders.join(','):'')+' limit '+Math.min(1000,Number(url.searchParams.get('limit'))||1000),params)).rows
    }else if(req.method==='POST'){
     const input=await body(req),list=Array.isArray(input)?input:[input];rows=[]
     for(const item of list){const keys=Object.keys(item).filter(k=>columns[table].has(k)),vals=keys.map(k=>typeof item[k]==='object'&&item[k]!==null?JSON.stringify(item[k]):item[k]),conflict=url.searchParams.get('on_conflict');let sql='insert into '+quote(table)+'('+keys.map(quote).join(',')+')values('+keys.map((_,i)=>'$'+(i+1)).join(',')+')';if(conflict&&columns[table].has(conflict))sql+=' on conflict('+quote(conflict)+') do update set '+keys.map(k=>quote(k)+'=excluded.'+quote(k)).join(',');rows.push(...(await tx.query(sql+' returning *',vals)).rows)}
    }else if(req.method==='PATCH'){
     const input=await body(req),keys=Object.keys(input).filter(k=>columns[table].has(k)),set=keys.map(k=>quote(k)+'='+param(typeof input[k]==='object'&&input[k]!==null?JSON.stringify(input[k]):input[k])).join(',');rows=(await tx.query('update '+quote(table)+' set '+set+where+' returning *',params)).rows
    }else if(req.method==='DELETE')rows=(await tx.query('delete from '+quote(table)+where+' returning *',params)).rows
    else throw new Error('Unsupported method')
    const single=(req.headers.accept||'').includes('vnd.pgrst.object+json');if(single&&rows.length!==1){const e=new Error('Expected one row');e.code='PGRST116';throw e}return single?rows[0]:rows
   })
   send(200,result===undefined?null:result)
  }catch(e){send(400,{message:e.message,code:e.code||'FIXTURE_ERROR',details:null,hint:null})}
 })
 server.listen(54399,'127.0.0.1',()=>console.log('Local-only fixture API ready at 127.0.0.1:54399'))
 process.on('SIGINT',()=>server.close(()=>db.close().then(()=>process.exit(0))))
})().catch(e=>{console.error(e);process.exitCode=1})
