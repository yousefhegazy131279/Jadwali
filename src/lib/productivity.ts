export const NOTE_COLORS = { gold:'#D4AF37',blue:'#60a5fa',green:'#34d399',purple:'#a78bfa',pink:'#f472b6',orange:'#fb923c',cyan:'#22d3ee',red:'#f87171',slate:'#94a3b8' } as const
export type NoteColor = keyof typeof NOTE_COLORS
export type Note = {id:string;user_id:string;title:string;content:string;color:NoteColor;pinned:boolean;project_id:string|null;schedule_id:string|null;version:number;updated_at:string;created_at:string}
export type Productivity = {current_streak:number;longest_streak:number;last_active_day:string|null;sessions:number;minutes:number;tasks:number;timezone:string}
export type Achievement = {id:string;title_ar:string;title_en:string;metric:'sessions'|'minutes'|'streak'|'tasks';threshold:number;icon:string;position:number}
export type Earned = {achievement_id:string;unlocked_at:string;celebrated_at:string|null}
export type Template = {id:string;title_ar:string;title_en:string;description_ar:string;description_en:string;days:number;tasks:{name:string;name_en:string;category:string;duration:number;type:'task'|'side';priority:'high'|'medium'|'low'}[];pomodoro:{workDuration:number;shortBreak:number;longBreak:number;cyclesBeforeLong:number}}
export type Challenge = {id:string;owner_id:string;title:string;join_code:string;starts_on:string;ends_on:string;goal_minutes:number;created_at:string}
export type Leader = {user_id:string;display_name:string;minutes:number;sessions:number}
export type FocusRoom = {id:string;owner_id:string;title:string;join_code:string;phase_id:string|null;phase:'idle'|'work'|'break';started_at:string|null;ends_at:string|null;duration_minutes:number;created_at:string}
export type WeeklyReport = {week_start:string;sessions:number;minutes:number;active_days:number;tasks_done:number;tasks_total:number;best_day:string|null;streak:number;timezone:string}
export const localDate = (date=new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export function achievementProgress(a:Achievement,p:Productivity){const value=a.metric==='streak'?p.longest_streak:p[a.metric];return Math.min(100,Math.max(0,value/a.threshold*100))}
export function errorText(error:unknown,ar=true){
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):''
 if(['42P01','42883','PGRST202','PGRST205'].includes(code))return ar?'تحتاج هذه الميزة إلى ترحيل قاعدة بيانات الإصدار 2.0. لم تُحفظ أي تغييرات.':'This feature requires the V2 database migration. No changes were saved.'
 if(code==='40001')return ar?'تغيرت الملاحظة على جهاز آخر. احتفظ بنصك وحدّث القائمة؛ لن نستبدل النسخة الأخرى تلقائيًا.':'This note changed on another device. Keep your text and refresh; the other version will not be overwritten.'
 return ar?'تعذر إكمال العملية. تحقق من الاتصال والصلاحية وأعد المحاولة.':'Could not complete the operation. Check your connection and access, then retry.'
}
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
export function validPushEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='fcm.googleapis.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname.endsWith('.notify.windows.com'))}catch{return false}}
