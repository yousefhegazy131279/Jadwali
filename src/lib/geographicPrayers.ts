import {CalculationMethod,Coordinates,HighLatitudeRule,Madhab,PrayerTimes} from 'adhan'
import tzLookup from '@photostructure/tz-lookup'

export const PRAYER_METHODS = {
  auto:['تلقائي حسب المنطقة','Automatic by region'],
  Egyptian:['الهيئة المصرية للمساحة','Egyptian Survey Authority'],
  UmmAlQura:['أم القرى — مكة','Umm al-Qura — Makkah'],
  MuslimWorldLeague:['رابطة العالم الإسلامي','Muslim World League'],
  Dubai:['دبي','Dubai'],Qatar:['قطر','Qatar'],Kuwait:['الكويت','Kuwait'],
  Karachi:['جامعة كراتشي','University of Karachi'],
  MoonsightingCommittee:['لجنة رؤية الهلال','Moonsighting Committee'],
  NorthAmerica:['أمريكا الشمالية — ISNA','North America — ISNA'],
  Singapore:['سنغافورة','Singapore'],Turkey:['تركيا','Turkey'],
} as const
export type PrayerMethod=keyof typeof PRAYER_METHODS
export type PrayerLocation={latitude:number;longitude:number;timezone:string;method:PrayerMethod;madhab:'shafi'|'hanafi';updatedAt:string}
export function locationTimezone(latitude:number,longitude:number){
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Invalid coordinates')
  return tzLookup(latitude,longitude)
}
export function validPrayerLocation(value:unknown):value is PrayerLocation{
  if(!value||typeof value!=='object')return false
  const p=value as PrayerLocation
  try{return typeof p.latitude==='number'&&typeof p.longitude==='number'&&p.timezone===locationTimezone(p.latitude,p.longitude)&&Object.hasOwn(PRAYER_METHODS,p.method)&&['shafi','hanafi'].includes(p.madhab)&&typeof p.updatedAt==='string'}catch{return false}
}
export function regionalPrayerMethod(timezone:string):Exclude<PrayerMethod,'auto'>{
  const region:Record<string,Exclude<PrayerMethod,'auto'>>={'Africa/Cairo':'Egyptian','Asia/Riyadh':'UmmAlQura','Asia/Dubai':'Dubai','Asia/Qatar':'Qatar','Asia/Kuwait':'Kuwait','Asia/Karachi':'Karachi','Asia/Dhaka':'Karachi','Asia/Singapore':'Singapore','Asia/Kuala_Lumpur':'Singapore','Europe/Istanbul':'Turkey','Europe/London':'MoonsightingCommittee'}
  return region[timezone]||(timezone.startsWith('America/')?'NorthAmerica':'MuslimWorldLeague')
}
export function geographicDate(now:Date,timezone:string){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',numberingSystem:'latn'}).formatToParts(now);const get=(key:string)=>parts.find(p=>p.type===key)?.value;return `${get('year')}-${get('month')}-${get('day')}`}
export function addPrayerDays(day:string,count:number){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+count);return date.toISOString().slice(0,10)}
export function geographicPrayerTimes(location:PrayerLocation,day:string):string[]{
  if(!validPrayerLocation(location)||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid prayer calculation parameters')
  const [year,month,date]=day.split('-').map(Number),check=new Date(Date.UTC(year,month-1,date,12))
  if(check.toISOString().slice(0,10)!==day)throw new Error('Invalid date')
  const method=location.method==='auto'?regionalPrayerMethod(location.timezone):location.method
  const coordinates=new Coordinates(location.latitude,location.longitude),params=CalculationMethod[method]()
  params.madhab=location.madhab==='hanafi'?Madhab.Hanafi:Madhab.Shafi
  params.highLatitudeRule=HighLatitudeRule.recommended(coordinates)
  // Umm al-Qura adds 30 minutes to the Isha interval during Ramadan.
  if(method==='UmmAlQura'&&new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{month:'numeric',timeZone:'UTC'}).format(check)==='9')params.adjustments.isha+=30
  const prayers=new PrayerTimes(coordinates,new Date(year,month-1,date,12),params)
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:location.timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23',numberingSystem:'latn'})
  return [prayers.fajr,prayers.dhuhr,prayers.asr,prayers.maghrib,prayers.isha].map(time=>{
    if(!Number.isFinite(time.getTime()))throw new Error('Prayer times unavailable for this latitude and date')
    return formatter.format(time)
  })
}
