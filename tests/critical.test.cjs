const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file) {
  const module = { exports: {} }
  new Function('module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, module.exports)
  return module.exports
}
const { completedPhaseCount, remainingSeconds, taskSessionNumber } = load('src/lib/progress.ts')
const { normalizePrayerTimes, isTime } = load('src/lib/preferences.ts')
const phases = [{ type: 'work', taskId: 'a' }, { type: 'shortBreak' }, { type: 'work', taskId: 'a' }, { type: 'longBreak' }, { type: 'work', taskId: 'b' }]
test('fresh device reconstructs phase index including intervening breaks', () => {
  assert.equal(completedPhaseCount(phases, [{ id: 'a', completed_sessions: 1 }]), 1)
  assert.equal(completedPhaseCount(phases, [{ id: 'a', completed_sessions: 2 }]), 3)
  assert.equal(completedPhaseCount(phases, [{ id: 'a', completed_sessions: 2 }, { id: 'b', completed_sessions: 1 }]), 5)
  assert.equal(completedPhaseCount(phases, [{ id: 'b', completed_sessions: 1 }]), 0)
  assert.equal(taskSessionNumber(phases, 4), 1)
})
test('deadline timing survives throttling and preserves paused remainder', () => {
  assert.equal(remainingSeconds('2026-09-24T12:00:10Z', 20, Date.parse('2026-09-24T12:00:03Z')), 7)
  assert.equal(remainingSeconds(null, 7), 7)
  assert.equal(remainingSeconds('2026-09-24T12:00:10Z', 20, Date.parse('2026-09-24T12:01:00Z')), 0)
})
test('saved prayers are used and malformed entries fall back individually', () => {
  assert.deepEqual(normalizePrayerTimes(['05:00', '12:30', '15:20', '18:10', '20:00']), ['05:00', '12:30', '15:20', '18:10', '20:00'])
  assert.equal(normalizePrayerTimes(['99:00'])[0], '04:25')
  assert.equal(isTime('12:99'), false)
})
test('database profile trigger and exactly-once progress RPC', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const db = new PGlite()
  await db.exec(`create schema auth;
    create role anon; create role authenticated;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create table public.profiles(id uuid primary key, email text, full_name text, role text);
    create table public.schedules(id uuid primary key, user_id uuid, pomodoro jsonb);
    create table public.tasks(id uuid primary key, user_id uuid, schedule_id uuid, type text, duration integer, completed_sessions integer, done boolean);
    insert into auth.users values ('00000000-0000-0000-0000-000000000001','existing@example.test','{"full_name":"Existing"}');`)
  await db.exec(fs.readFileSync('supabase/migrations/202609240001_critical_fixes.sql', 'utf8'))
  await db.exec(`insert into auth.users values ('00000000-0000-0000-0000-000000000002','new@example.test','{"full_name":"New user"}');`)
  assert.equal((await db.query('select count(*)::int as n from profiles')).rows[0].n, 2)
  await db.exec(`insert into schedules values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','{"workDuration":50}');
    insert into tasks values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','task',75,0,false);
    set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`)
  const complete = n => db.query(`select record_work_session('20000000-0000-0000-0000-000000000001', ${n})`)
  await assert.rejects(complete(2), /earlier sessions/)
  await complete(1); await complete(1); await complete(2)
  assert.deepEqual((await db.query('select completed_sessions, done from tasks')).rows[0], { completed_sessions: 2, done: true })
  assert.equal((await db.query('select sum(duration_minutes)::int as n from task_progress')).rows[0].n, 75)
  await db.exec(`set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';`)
  await assert.rejects(complete(1), /Not authorized/)
  await db.exec(`create table projects(id uuid primary key,user_id uuid);
    create table prayers(id uuid primary key,user_id uuid,schedule_id uuid);
    create table custom_cards(id uuid primary key,user_id uuid,schedule_id uuid);
    grant usage on schema public,auth to authenticated;
    grant select,insert,update,delete on all tables in schema public to authenticated;`)
  await db.exec(fs.readFileSync('supabase/migrations/202609240002_collaboration_projects.sql','utf8'))
  await db.exec(fs.readFileSync('supabase/migrations/202609240003_jadwool_quota.sql','utf8'))
  const owner='00000000-0000-0000-0000-000000000001',guest='00000000-0000-0000-0000-000000000002',schedule='10000000-0000-0000-0000-000000000001'
  const asUser=async id=>db.exec(`set role authenticated; set request.jwt.claim.sub='${id}';`)
  await asUser(guest)
  assert.equal((await db.query('select * from schedules')).rows.length,0)
  await assert.rejects(db.query(`select share_schedule('${schedule}','existing@example.test','editor')`),/Only the owner/)
  await asUser(owner)
  await db.query(`select share_schedule('${schedule}','new@example.test','viewer')`)
  await asUser(guest)
  assert.equal((await db.query('select * from schedules')).rows.length,1)
  assert.equal((await db.query(`update tasks set done=false returning id`)).rows.length,0)
  await assert.rejects(complete(1),/Not authorized/)
  await asUser(owner)
  await db.query(`select share_schedule('${schedule}','new@example.test','editor')`)
  await asUser(guest)
  await complete(1)
  assert.equal((await db.query(`select * from schedule_member_progress('${schedule}')`)).rows.length,2)
  for(let i=0;i<30;i++)assert.equal((await db.query('select consume_jadwool_request() as ok')).rows[0].ok,true)
  assert.equal((await db.query('select consume_jadwool_request() as ok')).rows[0].ok,false)
  await asUser(owner)
  await db.query(`select remove_schedule_member('${schedule}','${guest}')`)
  await asUser(guest)
  assert.equal((await db.query('select * from schedules')).rows.length,0)
  await db.close()
})

test('AI draft validation rejects invalid dates, durations and oversized plans',()=>{
 const {validateDraft}=load('supabase/functions/_shared/schedule.ts')
 const draft={title:'Study',date:'2026-09-25',start_time:'17:00',tasks:[{name:'Math',category:'Study',duration_minutes:90}]}
 assert.equal(validateDraft(draft),true)
 assert.equal(validateDraft({...draft,date:'2026-99-99'}),false)
 assert.equal(validateDraft({...draft,start_time:'25:00'}),false)
 assert.equal(validateDraft({...draft,tasks:[{...draft.tasks[0],duration_minutes:-5}]}),false)
})
test('analytics caps final partial sessions and fills empty days',()=>{
 const {summarizeTasks,dailySessions}=load('src/lib/analytics.ts')
 const summary=summarizeTasks([{id:'t',done:true,category:'Study',duration:75,completed_sessions:2,schedule_id:'s'}],[{id:'s',pomodoro:{workDuration:50}}])
 assert.equal(summary.hours,1.25);assert.equal(summary.completion,100)
 const days=dailySessions([],28,new Date('2026-09-25T12:00:00'))
 assert.equal(days.length,28);assert.equal(days[27].day,'2026-09-25');assert.equal(days[0].sessions,0)
})
