const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
let db
const owner='00000000-0000-0000-0000-000000000001',guest='00000000-0000-0000-0000-000000000002',stranger='00000000-0000-0000-0000-000000000003'
const schedule='10000000-0000-0000-0000-000000000001',task='20000000-0000-0000-0000-000000000001',project='30000000-0000-0000-0000-000000000001'
async function as(id){await db.exec(`reset role;set request.jwt.claim.sub='${id}';set role authenticated`)}
async function admin(){await db.exec('reset role')}
const quote=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb"
before(async()=>{
 const {PGlite}=await import('@electric-sql/pglite');db=new PGlite()
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create table profiles(id uuid primary key,email text,full_name text,role text);
 create table projects(id uuid primary key default gen_random_uuid(),user_id uuid,name text);
 create table schedules(id uuid primary key default gen_random_uuid(),user_id uuid,title text,day date,start_time time,pomodoro jsonb,project_id uuid);
 create table tasks(id uuid primary key default gen_random_uuid(),user_id uuid,schedule_id uuid references schedules(id) on delete cascade,name text,category text,type text,duration integer,completed_sessions integer default 0,done boolean default false,priority text);
 create table settings(user_id uuid primary key,prayer_times jsonb);
 create table prayers(id uuid primary key default gen_random_uuid(),user_id uuid,schedule_id uuid,day date,name text,time time,done boolean);
 create table custom_cards(id uuid primary key,user_id uuid,schedule_id uuid);
 grant usage on schema public,auth to authenticated;grant select,insert,update,delete on all tables in schema public to authenticated;
 insert into auth.users values('${owner}','owner@test.invalid','{}'),('${guest}','guest@test.invalid','{}'),('${stranger}','stranger@test.invalid','{}');`)
 for(const name of ['202609240001_critical_fixes.sql','202609240002_collaboration_projects.sql','202610050002_atomic_schedule_creation.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+name,'utf8'))
 await db.exec(`create table notes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),content text,updated_at timestamptz default now());insert into notes(user_id,content)values('${owner}',null);alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`)
 await db.exec(`insert into settings values('${owner}','[\"05:27\",\"12:44\",\"16:05\",\"18:31\",\"19:50\"]')`)
 await db.exec(fs.readFileSync('supabase/migrations/20261019033549_productivity_v2_foundation.sql','utf8'))
 await db.exec(`delete from notes;`)
 await db.exec(fs.readFileSync('supabase/migrations/20261019040249_productivity_v2_scheduler.sql','utf8').split('-- Hosted extensions')[0]+'\ncommit;')
 await db.exec(fs.readFileSync('supabase/migrations/20261019044104_productivity_v2_template_prayers.sql','utf8'))
 await db.exec(`insert into projects values('${project}','${owner}','Private project');insert into schedules(id,user_id,title,day,start_time,pomodoro) values('${schedule}','${owner}','Math',current_date,'08:00','{"workDuration":25}');insert into tasks(id,user_id,schedule_id,name,category,type,duration)values('${task}','${owner}','${schedule}','Math','Study','task',300);`)
})
after(async()=>{await db?.close()})
test('V2 notes enforce ownership, link ownership, request idempotency and version conflicts',async()=>{
 await as(owner)
 const note={id:'40000000-0000-0000-0000-000000000001',title:'Math notes',content:'Study algebra',color:'blue',pinned:true,project_id:project,schedule_id:schedule}
 const req='50000000-0000-0000-0000-000000000001'
 const save=(n,v,r)=>db.query(`select save_note(${quote(n)},${v},'${r}') as note`)
 assert.equal((await save(note,0,req)).rows[0].note.version,1)
 assert.equal((await save(note,0,req)).rows[0].note.version,1)
 const edited={...note,content:'Revised algebra'}
 assert.equal((await save(edited,1,'50000000-0000-0000-0000-000000000002')).rows[0].note.version,2)
 await assert.rejects(save({...edited,content:'Stale copy'},1,'50000000-0000-0000-0000-000000000003'),/changed on another device/)
 await as(guest);assert.equal((await db.query('select * from notes')).rows.length,0)
 await assert.rejects(save({...note,id:'40000000-0000-0000-0000-000000000002'},0,'50000000-0000-0000-0000-000000000004'),/Project is not yours/)
 await assert.rejects(db.query(`insert into notes(user_id,content) values('${owner}','Forbidden')`),/row-level security/)
 await as(owner);assert.equal((await db.query('select content from notes')).rows[0].content,'Revised algebra')
})
test('sessions unlock earned achievements exactly once and users cannot award themselves',async()=>{
 await as(owner);await db.query(`select record_work_session('${task}',1)`);await db.query(`select record_work_session('${task}',1)`)
 let s=(await db.query('select refresh_productivity() as s')).rows[0].s
 assert.equal(s.sessions,1);assert.equal(Number(s.minutes),25);assert.equal(s.current_streak,1)
 assert.equal((await db.query(`select count(*)::int as n from user_achievements where achievement_id='sessions-1'`)).rows[0].n,1)
 await assert.rejects(db.query(`insert into user_achievements(user_id,achievement_id) values('${owner}','sessions-500')`),/permission denied/)
 await assert.rejects(db.query(`update user_achievements set achievement_id='sessions-500'`),/permission denied/)
 for(let n=2;n<=10;n++)await db.query(`select record_work_session('${task}',${n})`)
 assert.equal((await db.query(`select count(*)::int as n from user_achievements where achievement_id='sessions-10'`)).rows[0].n,1)
 await as(guest);assert.equal((await db.query('select * from user_achievements')).rows.length,0)
})
test('streak uses distinct local dates, keeps the best streak and resets after a gap',async()=>{
 await admin();await db.exec(`insert into schedules(id,user_id,title,day,start_time,pomodoro)values('10000000-0000-0000-0000-000000000002','${guest}','Guest',current_date,'08:00','{"workDuration":25}');insert into tasks(id,user_id,schedule_id,name,category,type,duration)values('20000000-0000-0000-0000-000000000002','${guest}','10000000-0000-0000-0000-000000000002','Guest study','Study','task',300);insert into task_progress(task_id,session_number,user_id,duration_minutes,completed_at)values('20000000-0000-0000-0000-000000000002',1,'${guest}',25,now()-interval '1 day'),('20000000-0000-0000-0000-000000000002',2,'${guest}',25,now()-interval '2 days'),('20000000-0000-0000-0000-000000000002',3,'${guest}',25,now()-interval '3 days');`)
 await as(guest);let s=(await db.query('select refresh_productivity() as s')).rows[0].s;assert.equal(s.current_streak,3);assert.equal(s.longest_streak,3)
 await assert.rejects(db.exec(`insert into productivity_preferences(user_id,timezone)values('${guest}','Bad/Timezone')`),/Invalid timezone/)
 await admin();await db.exec(`update task_progress set completed_at=completed_at-interval '3 days' where user_id='${guest}'`)
 await as(guest);s=(await db.query('select refresh_productivity() as s')).rows[0].s;assert.equal(s.current_streak,0);assert.equal(s.longest_streak,3)
})
test('templates create seven plans atomically, are immutable and retry without duplicates',async()=>{
 await as(owner);const count=async()=>(await db.query('select count(*)::int as n from schedules')).rows[0].n;const before=await count()
 const query=`select create_template_plan('exams',current_date,'08:00',null,'60000000-0000-0000-0000-000000000001','en') as ids`
 const plans=(await db.query(query)).rows[0].ids;
 assert.equal((await db.query('select count(*)::int as n from prayers where schedule_id=any($1::uuid[])',[plans])).rows[0].n,35);
 assert.equal((await db.query("select time::text as t from prayers where schedule_id=$1 and name='الفجر'",[plans[0]])).rows[0].t,'05:27:00');
 assert.equal((await db.query(query)).rows[0].ids.length,7);assert.equal((await db.query(query)).rows[0].ids.length,7);assert.equal(await count(),before+7)
 await assert.rejects(db.query(`update templates set days=1`),/permission denied/)
 await as(guest);await assert.rejects(db.query(`select create_template_plan('exams',current_date,'08:00','${project}','60000000-0000-0000-0000-000000000002','ar')`),/does not belong/)
 assert.equal((await db.query(`select count(*)::int as n from schedules where user_id='${guest}'`)).rows[0].n,1)
})
test('challenge invitations do not expose private data and scores count after joining only',async()=>{
 await as(owner);const id=(await db.query(`select create_challenge('Private goal',current_date,current_date+30,600,'Owner alias') as id`)).rows[0].id
 const code=(await db.query(`select join_code from challenges where id='${id}'`)).rows[0].join_code
 await as(stranger);assert.equal((await db.query('select * from challenges')).rows.length,0);await assert.rejects(db.query(`select * from challenge_leaderboard('${id}')`),/Join the challenge/)
 await as(guest);await db.query(`select join_challenge('${code}','Guest alias')`)
 const rows=(await db.query(`select * from challenge_leaderboard('${id}')`)).rows
 assert.equal(rows.length,2);assert.equal(Number(rows.find(x=>x.user_id===owner).minutes),0);assert.ok(rows.every(x=>!('email' in x)))
 await as(owner);await db.query(`select record_work_session('${task}',11)`)
 await as(guest);assert.equal(Number((await db.query(`select * from challenge_leaderboard('${id}')`)).rows.find(x=>x.user_id===owner).minutes),25)
 await db.query(`select leave_challenge('${id}')`);assert.equal((await db.query('select * from challenges')).rows.length,0)
})
test('group focus requires host, a real deadline, prior membership, and gives one credit per phase',async()=>{
 await as(owner);const rid=(await db.query(`select create_focus_room('Study room','Host') as id`)).rows[0].id;const code=(await db.query(`select join_code from focus_rooms where id='${rid}'`)).rows[0].join_code
 await as(guest);await db.query(`select join_focus_room('${code}','Guest')`);await assert.rejects(db.query(`select start_room_phase('${rid}',25,'work')`),/Only the host/)
 await as(owner);await db.query(`select start_room_phase('${rid}',25,'work')`);const phase=(await db.query(`select phase_id from focus_rooms where id='${rid}'`)).rows[0].phase_id
 await assert.rejects(db.query(`select finish_room_focus('${rid}','${phase}')`),/Complete a full/)
 await as(stranger);await db.query(`select join_focus_room('${code}','Late join')`)
 await admin();await db.exec(`update focus_room_members set joined_at=now()-interval '1 hour' where room_id='${rid}' and user_id in ('${owner}','${guest}');update focus_room_phases set started_at=now()-interval '30 minutes',ends_at=now()-interval '5 minutes' where id='${phase}';update focus_rooms set ends_at=now()-interval '5 minutes' where id='${rid}';`)
 await as(owner);await db.query(`select start_room_phase('${rid}',5,'break')`)
 await as(guest);await db.query(`select finish_room_focus('${rid}','${phase}')`);await db.query(`select finish_room_focus('${rid}','${phase}')`)
 assert.equal((await db.query('select count(*)::int as n from room_focus_sessions')).rows[0].n,1)
 await as(stranger);await assert.rejects(db.query(`select finish_room_focus('${rid}','${phase}')`),/Complete a full/)
 await assert.rejects(db.query(`insert into room_focus_sessions(user_id,phase_id,duration_minutes)values('${stranger}',gen_random_uuid(),90)`),/permission denied/)
})
test('weekly reports include group focus and remain private',async()=>{
 await as(guest);const r=(await db.query(`select generate_weekly_report(current_date) as report`)).rows[0].report
 assert.ok(Number(r.sessions)>=1);assert.ok(Number(r.minutes)>=25);assert.equal(r.timezone,'Africa/Cairo')
 await as(stranger);assert.equal((await db.query('select * from weekly_reports')).rows.length,0)
 await assert.rejects(db.query(`select generate_weekly_report(current_date+14)`),/Invalid report week/)
})
test('all new privileged public RPCs deny anonymous execution',async()=>{
 await admin();const rows=(await db.query(`select p.proname,has_function_privilege('anon',p.oid,'EXECUTE') as anon from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_note','create_challenge','join_challenge','challenge_leaderboard','create_focus_room','start_room_phase','finish_room_focus','send_room_message','refresh_productivity','create_template_plan','generate_weekly_report')`)).rows
 assert.ok(rows.length>=11);assert.ok(rows.every(x=>!x.anon))
})
test('reminders are opt-in, deduplicated, service-only and leased once per delivery batch',async()=>{
 await as(owner);await db.query(`insert into productivity_preferences(user_id,daily_reminder,reminder_time)values('${owner}',true,'00:00')`)
 await assert.rejects(db.query('select enqueue_productivity_jobs()'),/permission denied/)
 await admin();await db.exec('set role service_role')
 const first=(await db.query('select enqueue_productivity_jobs() as n')).rows[0].n
 assert.equal(first,1);assert.equal((await db.query('select enqueue_productivity_jobs() as n')).rows[0].n,0)
 const claim=(await db.query('select * from claim_productivity_deliveries(20)')).rows;assert.equal(claim.length,1);assert.equal(claim[0].email_status,'not_requested');assert.equal((await db.query('select * from claim_productivity_deliveries(20)')).rows.length,0)
 await as(guest);assert.equal((await db.query('select * from productivity_notifications')).rows.length,0)
 await assert.rejects(db.query(`insert into productivity_notifications(user_id,dedupe_key,title,body)values('${guest}','forged','Forged','Forged')`),/permission denied/)
})

test('note deletion is version checked, retry safe and cannot cross accounts',async()=>{
 await as(owner);const note={id:'40000000-0000-0000-0000-000000000099',content:'Remove me'};
 await db.query(`select save_note(${quote(note)},0,'50000000-0000-0000-0000-000000000099')`);
 await as(guest);await assert.rejects(db.query(`select delete_note('${note.id}',1,'50000000-0000-0000-0000-000000000098')`),/changed on another device/);
 await as(owner);await assert.rejects(db.query(`select delete_note('${note.id}',2,'50000000-0000-0000-0000-000000000098')`),/changed on another device/);
 const q=`select delete_note('${note.id}',1,'50000000-0000-0000-0000-000000000097') as removed`;
 assert.equal((await db.query(q)).rows[0].removed,true);assert.equal((await db.query(q)).rows[0].removed,true);
})

test('room ranking is member-only and the host cannot abandon ownership',async()=>{
 await as(owner);const rid=(await db.query(`select create_focus_room('Ranking room','Host') as id`)).rows[0].id;
 await as(guest);await assert.rejects(db.query(`select * from room_leaderboard('${rid}')`),/Join the room/);
 await as(owner);assert.equal((await db.query(`select * from room_leaderboard('${rid}')`)).rows.length,1);
 await assert.rejects(db.query(`select leave_focus_room('${rid}')`),/host must delete/);
})
