// IndexedDB is scoped by authenticated account. Tokens and privileged responses are never cached.
type CacheRow={key:string;userId:string;value:unknown;updated:number}
export type PendingWrite={id:string;userId:string;kind:'note-save'|'note-delete'|'session';payload:Record<string,unknown>;created:number;error?:string}
let account:string|null=null
export function setOfflineAccount(id:string|null){if(account===id)return;account=id;if(typeof window!=='undefined')window.dispatchEvent(new Event('jadwali-offline-change'))}
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open('jadwali-private-v2',1);req.onupgradeneeded=()=>{for(const name of ['cache','queue'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name,{keyPath:name==='cache'?'key':'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function access<T>(store:string,mode:IDBTransactionMode,operation:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,mode);const req=operation(tx.objectStore(store));let value:T;req.onsuccess=()=>{value=req.result};tx.oncomplete=()=>{database.close();resolve(value)};tx.onerror=()=>{database.close();reject(tx.error)};tx.onabort=()=>{database.close();reject(tx.error)}})}
export async function saveCache(userId:string,key:string,value:unknown){await access('cache','readwrite',s=>s.put({key:userId+'|'+key,userId,value,updated:Date.now()} satisfies CacheRow))}
export async function readCache<T>(userId:string,key:string):Promise<T|null>{const row=await access<CacheRow|undefined>('cache','readonly',s=>s.get(userId+'|'+key));return row?.userId===userId?row.value as T:null}
export async function pendingWrites(userId:string){return (await access<PendingWrite[]>('queue','readonly',s=>s.getAll())).filter(x=>x.userId===userId).sort((a,b)=>a.created-b.created)}
export async function enqueue(write:PendingWrite){await access('queue','readwrite',s=>s.put(write));window.dispatchEvent(new Event('jadwali-offline-change'))}
export async function removePending(id:string){await access('queue','readwrite',s=>s.delete(id));window.dispatchEvent(new Event('jadwali-offline-change'))}
export async function clearOfflineAccount(userId:string){for(const store of ['cache','queue']){const rows=await access<(CacheRow&PendingWrite)[]>(store,'readonly',s=>s.getAll());for(const row of rows)if(row.userId===userId)await access(store,'readwrite',s=>s.delete(store==='cache'?row.key:row.id))}window.dispatchEvent(new Event('jadwali-offline-change'))}
export async function offlineFetch(input:RequestInfo|URL,init?:RequestInit){
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url)
 const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase()
 const userId=account
 const allowed=/\/rest\/v1\/(schedules|tasks|prayers|projects|notes|templates|achievements|user_achievements|user_streaks|settings)(\?|$)/.test(url.pathname+url.search)
 // Never attach a new user's response to a previous account's namespace during an auth transition.
 let tokenUser:string|null=null
 try{const header=new Headers(init?.headers||(input instanceof Request?input.headers:undefined)).get('authorization')||'';const payload=header.replace(/^Bearer\s+/i,'').split('.')[1];tokenUser=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/'))).sub||null}catch{/* Anonymous requests are not cached. */}
 const cacheable=method==='GET'&&!!userId&&userId===tokenUser&&allowed
 const key='rest:'+url.pathname+url.search
 try{const response=await fetch(input,init);if(cacheable&&response.ok){const value=await response.clone().json();void saveCache(userId!,key,value).catch(()=>{})}return response}
 catch(error){if(cacheable){const cached=await readCache<unknown>(userId!,key).catch(()=>null);if(cached!==null){window.dispatchEvent(new Event('jadwali-cached-data'));return Response.json(cached,{headers:{'x-jadwali-offline':'true'}})}}throw error}
}
