'use client'
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid,PieChart,Pie,Cell} from 'recharts'
export default function AnalyticsCharts({series,categories}:{series:{day:string;sessions:number}[];categories:{name:string;value:number}[]}){
  const colors=['#D4AF37','#38bdf8','#a78bfa','#34d399','#fb7185']
  return <div className="grid lg:grid-cols-2 gap-4"><div className="v1-panel min-w-0 h-80" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={series}><CartesianGrid strokeDasharray="3 3" opacity={0.2}/><XAxis dataKey="day" tick={{fontSize:10}} minTickGap={30}/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="sessions" stroke="#D4AF37" strokeWidth={3}/></LineChart></ResponsiveContainer></div><div className="v1-panel min-w-0 h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categories} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%">{categories.map((c,i)=><Cell key={c.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></div>
}
