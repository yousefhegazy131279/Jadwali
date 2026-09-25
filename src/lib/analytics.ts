type Task={id:string;done:boolean;category:string;duration:number;completed_sessions:number|null;schedule_id:string|null}
type Schedule={id:string;pomodoro:{workDuration?:number}|null}
export function summarizeTasks(tasks:Task[],schedules:Schedule[]){
  const durations=new Map(schedules.map(s=>[s.id,s.pomodoro?.workDuration||50]))
  let minutes=0,sessions=0
  const categories:Record<string,number>={}
  for(const task of tasks){
    sessions+=task.completed_sessions??0
    minutes+=Math.min(task.duration||0,(task.completed_sessions??0)*(durations.get(task.schedule_id??'')??50))
    categories[task.category||'—']=(categories[task.category||'—']??0)+1
  }
  return {sessions,hours:minutes/60,completion:tasks.length?Math.round(tasks.filter(t=>t.done).length/tasks.length*100):0,categories:Object.entries(categories).map(([name,value])=>({name,value}))}
}
export function dailySessions(events:{completed_at:string}[],days=28,now=new Date()){
  const localDay=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const counts=new Map<string,number>()
  for(let i=days-1;i>=0;i--){const date=new Date(now);date.setDate(date.getDate()-i);counts.set(localDay(date),0)}
  for(const event of events){const day=localDay(new Date(event.completed_at));if(counts.has(day))counts.set(day,counts.get(day)!+1)}
  return [...counts].map(([day,sessions])=>({day,sessions}))
}
