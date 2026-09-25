export type ScheduleDraft = { title: string; date: string; start_time: string; tasks: { name: string; category: string; duration_minutes: number }[] }
export const draftSchema = {
  type:'object',additionalProperties:false,required:['title','date','start_time','tasks'],
  properties:{title:{type:'string'},date:{type:'string'},start_time:{type:'string'},tasks:{type:'array',items:{type:'object',additionalProperties:false,required:['name','category','duration_minutes'],properties:{name:{type:'string'},category:{type:'string'},duration_minutes:{type:'integer'}}}}},
}
export function validateDraft(value: unknown): value is ScheduleDraft {
  if(!value||typeof value!=='object')return false
  const d=value as ScheduleDraft
  return typeof d.title==='string'&&d.title.trim().length>0&&d.title.length<=150&&
    typeof d.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Number.isFinite(Date.parse(d.date+'T12:00:00Z'))&&new Date(d.date+'T12:00:00Z').toISOString().slice(0,10)===d.date&&
    typeof d.start_time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(d.start_time)&&
    Array.isArray(d.tasks)&&d.tasks.length>0&&d.tasks.length<=20&&d.tasks.every(task=>
      typeof task.name==='string'&&task.name.trim().length>0&&task.name.length<=200&&
      typeof task.category==='string'&&task.category.trim().length>0&&task.category.length<=100&&
      Number.isInteger(task.duration_minutes)&&task.duration_minutes>=1&&task.duration_minutes<=720)&&d.tasks.reduce((sum,task)=>sum+task.duration_minutes,0)<=1440
}
