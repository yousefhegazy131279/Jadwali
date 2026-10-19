const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
require('fake-indexeddb/auto')
global.window=new EventTarget()
const mod={exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/offline.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports)
const offline=mod.exports
test('offline queues coalesce repeated edits, preserve order and isolate accounts',async()=>{
 await offline.enqueue({id:'a:note1',userId:'a',kind:'note-save',payload:{content:'First'},created:1})
 await offline.enqueue({id:'a:note1',userId:'a',kind:'note-save',payload:{content:'Latest'},created:1})
 await offline.enqueue({id:'a:session1',userId:'a',kind:'session',payload:{},created:2})
 await offline.enqueue({id:'b:note1',userId:'b',kind:'note-save',payload:{content:'Private'},created:1})
 const a=await offline.pendingWrites('a');assert.equal(a.length,2);assert.equal(a[0].payload.content,'Latest');assert.equal(a[1].kind,'session')
 assert.equal((await offline.pendingWrites('b')).length,1)
 await offline.saveCache('a','notes',[{content:'Private A'}]);assert.equal(await offline.readCache('b','notes'),null)
 await offline.clearOfflineAccount('a');assert.equal((await offline.pendingWrites('a')).length,0);assert.equal((await offline.pendingWrites('b')).length,1)
})
test('cached API fallback excludes auth/admin data and cannot cross an auth transition',async()=>{
 const realFetch=global.fetch
 const auth=id=>({Authorization:'Bearer '+Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id})).toString('base64url')+'.fixture'})
 try{
  offline.setOfflineAccount('a');global.fetch=async()=>Response.json([{title:'A plan'}]);await offline.offlineFetch('https://test.invalid/rest/v1/schedules?select=*',{headers:auth('a')})
  await new Promise(r=>setTimeout(r,10));global.fetch=async()=>{throw new TypeError('Network offline')}
  assert.equal((await (await offline.offlineFetch('https://test.invalid/rest/v1/schedules?select=*',{headers:auth('a')})).json())[0].title,'A plan')
  await assert.rejects(offline.offlineFetch('https://test.invalid/rest/v1/schedules?select=*',{headers:auth('b')}),/Network offline/)
  offline.setOfflineAccount('b');await assert.rejects(offline.offlineFetch('https://test.invalid/rest/v1/schedules?select=*',{headers:auth('b')}),/Network offline/)
  await offline.saveCache('b','rest:/rest/v1/profiles?select=*',[{email:'never-cache'}]);await assert.rejects(offline.offlineFetch('https://test.invalid/rest/v1/profiles?select=*',{headers:auth('b')}),/Network offline/)
  await assert.rejects(offline.offlineFetch('https://test.invalid/rest/v1/notes',{method:'POST',headers:auth('b'),body:'{}'}),/Network offline/)
 }finally{global.fetch=realFetch}
})
