const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),{execFileSync}=require('node:child_process')
const source=ts.transpileModule(fs.readFileSync('src/lib/geographicPrayers.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
const mod={exports:{}};new Function('require','module','exports',source)(require,mod,mod.exports)
const geo=mod.exports
const cairo={latitude:30.044,longitude:31.236,timezone:'Africa/Cairo',method:'auto',madhab:'shafi',updatedAt:'2026-10-19T00:00:00Z'}
const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3))
test('geographic prayer times derive timezone from coordinates, validate dates and use the planned day',()=>{
 assert.equal(geo.locationTimezone(30.044,31.236),'Africa/Cairo');assert.equal(geo.locationTimezone(40.713,-74.006),'America/New_York')
 const today=geo.geographicPrayerTimes(cairo,'2026-10-19'),winter=geo.geographicPrayerTimes(cairo,'2026-12-19')
 assert.equal(today.length,5);assert.ok(today.every(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
 assert.notDeepEqual(today,winter);assert.ok(today.every((time,i)=>i===0||minutes(time)>minutes(today[i-1])))
 assert.throws(()=>geo.geographicPrayerTimes(cairo,'2026-02-30'));assert.throws(()=>geo.geographicPrayerTimes({...cairo,timezone:'UTC'},'2026-10-19'));assert.throws(()=>geo.locationTimezone(91,0))
 assert.equal(geo.addPrayerDays('2026-12-30',3),'2027-01-02')
})
test('prayer calculation is independent of device timezone, and respects geographic midnight and DST',()=>{
 const script=`const m={exports:{}};new Function('require','module','exports',${JSON.stringify(source)})(require,m,m.exports);process.stdout.write(JSON.stringify(m.exports.geographicPrayerTimes(${JSON.stringify(cairo)},'2026-10-19')))`
 const result=timezone=>execFileSync(process.execPath,['-e',script],{env:{...process.env,TZ:timezone},encoding:'utf8'})
 assert.equal(result('Pacific/Honolulu'),result('Asia/Tokyo'))
 assert.equal(geo.geographicDate(new Date('2026-10-19T22:30:00Z'),'Africa/Cairo'),'2026-10-20')
 const before=geo.geographicPrayerTimes(cairo,'2026-10-29'),after=geo.geographicPrayerTimes(cairo,'2026-10-30')
 assert.ok(minutes(after[1])-minutes(before[1])>=-62&&minutes(after[1])-minutes(before[1])<=-58)
})
test('Umm al-Qura Ramadan adjustment and Hanafi Asr are honored',()=>{
 const makkah={...cairo,latitude:21.422,longitude:39.826,timezone:geo.locationTimezone(21.422,39.826),method:'UmmAlQura'}
 const ramadan=geo.geographicPrayerTimes(makkah,'2026-02-25'),ordinary=geo.geographicPrayerTimes(makkah,'2026-01-10')
 assert.ok(Math.abs(minutes(ramadan[4])-minutes(ramadan[3])-120)<=1)
 assert.ok(Math.abs(minutes(ordinary[4])-minutes(ordinary[3])-90)<=1)
 assert.ok(minutes(geo.geographicPrayerTimes({...cairo,madhab:'hanafi'},'2026-10-19')[2])>minutes(geo.geographicPrayerTimes(cairo,'2026-10-19')[2]))
})
