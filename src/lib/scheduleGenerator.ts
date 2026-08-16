// ============================================================
//  src/lib/scheduleGenerator.ts
//  خوارزمية توليد الجدول الذكي
// ============================================================

export type Material = {
    name: string
    hours: number
  }
  
  export type PrayerTime = {
    name: string
    time: string // HH:mm
  }
  
  export type GeneratedSession = {
    day: string
    time_start: string
    time_end: string
    title: string
    type: 'study' | 'break' | 'prayer' | 'long-break'
    project_id: string | null
  }
  
  export type GenerateScheduleInput = {
    date: string // YYYY-MM-DD
    startTime: string // HH:mm
    endTime: string // HH:mm
    materials: Material[]
    prayerTimes: PrayerTime[]
    sessionDuration: number // minutes (default 50)
    shortBreak: number // minutes (default 10)
    longBreakAfter: number // number of sessions before long break (default 4)
    longBreakDuration: number // minutes (default 30)
  }
  
  export function generateSchedule(input: GenerateScheduleInput): GeneratedSession[] {
    const {
      date,
      startTime,
      endTime,
      materials,
      prayerTimes,
      sessionDuration = 50,
      shortBreak = 10,
      longBreakAfter = 4,
      longBreakDuration = 30,
    } = input
  
    const startMin = timeToMinutes(startTime)
    const endMin = timeToMinutes(endTime)
    let currentMin = startMin
  
    // حساب عدد الجلسات المطلوبة لكل مادة
    let sessions: { material: string; duration: number }[] = []
    materials.forEach((m) => {
      const totalMinutes = m.hours * 60
      const sessionCount = Math.ceil(totalMinutes / sessionDuration)
      for (let i = 0; i < sessionCount; i++) {
        sessions.push({
          material: m.name,
          duration: Math.min(sessionDuration, totalMinutes - i * sessionDuration),
        })
      }
    })
  
    // إزالة الجلسات التي مدتها صفر (في حالة الساعات الصغيرة)
    sessions = sessions.filter((s) => s.duration > 0)
  
    // دمج أوقات الصلاة في خط زمني واحد مع الجلسات
    const events: { time: number; type: 'prayer'; name: string }[] = prayerTimes.map((p) => ({
      time: timeToMinutes(p.time),
      type: 'prayer',
      name: p.name,
    }))
    // ترتيب الأحداث حسب الوقت
    events.sort((a, b) => a.time - b.time)
  
    const result: GeneratedSession[] = []
    let sessionIndex = 0
    let consecutiveStudySessions = 0
  
    for (let i = 0; i < sessions.length; i++) {
      // التحقق من وجود صلاة في الفترة القادمة
      const nextPrayer = events.find((e) => e.time > currentMin && e.time < currentMin + sessionDuration + 5)
      if (nextPrayer) {
        // إضافة فاصل صلاة إذا كان الوقت المتبقي قبل الصلاة أقل من 5 دقائق
        const prayerTime = nextPrayer.time
        if (prayerTime - currentMin > 1) {
          // أضف استراحة صلاة
          result.push({
            day: date,
            time_start: minutesToTime(currentMin),
            time_end: minutesToTime(prayerTime + 5), // نضيف 5 دقائق بعد الصلاة للراحة
            title: `صلاة ${nextPrayer.name}`,
            type: 'prayer',
            project_id: null,
          })
          currentMin = prayerTime + 5
        } else {
          // تخطي الصلاة (من المفترض أن الوقت مناسب)
          // نضيف استراحة قصيرة
          result.push({
            day: date,
            time_start: minutesToTime(currentMin),
            time_end: minutesToTime(currentMin + 5),
            title: 'استعداد للصلاة',
            type: 'break',
            project_id: null,
          })
          currentMin += 5
          // ثم الصلاة
          result.push({
            day: date,
            time_start: minutesToTime(currentMin),
            time_end: minutesToTime(prayerTime + 5),
            title: `صلاة ${nextPrayer.name}`,
            type: 'prayer',
            project_id: null,
          })
          currentMin = prayerTime + 5
        }
        // بعد الصلاة نستمر
        // نعيد فحص الصلاة التالية
        continue // نعيد التكرار لهذه الجلسة (نستخدم i-- أو نعيد معالجة نفس الجلسة)
      }
  
      // الجلسة الحالية
      const session = sessions[i]
      const start = currentMin
      const end = start + session.duration
  
      if (end > endMin) {
        // إذا تجاوزنا وقت الانتهاء، نقوم بقص الجلسة أو تخطيها
        // نضيف ما تبقى من وقت
        if (end - currentMin > 5) {
          result.push({
            day: date,
            time_start: minutesToTime(currentMin),
            time_end: minutesToTime(endMin),
            title: `${session.material} (مقتطع)`,
            type: 'study',
            project_id: null,
          })
        }
        break
      }
  
      result.push({
        day: date,
        time_start: minutesToTime(start),
        time_end: minutesToTime(end),
        title: session.material,
        type: 'study',
        project_id: null,
      })
  
      currentMin = end
      consecutiveStudySessions++
  
      // التحقق من وجود صلاة بعد الجلسة
      const afterPrayer = events.find((e) => e.time > currentMin && e.time < currentMin + shortBreak + 5)
      if (afterPrayer) {
        // نضيف استراحة قصيرة حتى وقت الصلاة
        const breakEnd = Math.min(afterPrayer.time, currentMin + shortBreak)
        if (breakEnd > currentMin) {
          result.push({
            day: date,
            time_start: minutesToTime(currentMin),
            time_end: minutesToTime(breakEnd),
            title: 'راحة قصيرة',
            type: 'break',
            project_id: null,
          })
          currentMin = breakEnd
        }
        // نضيف الصلاة
        result.push({
          day: date,
          time_start: minutesToTime(currentMin),
          time_end: minutesToTime(afterPrayer.time + 5),
          title: `صلاة ${afterPrayer.name}`,
          type: 'prayer',
          project_id: null,
        })
        currentMin = afterPrayer.time + 5
        // لا نضيف راحة إضافية لأن الصلاة تعتبر راحة
        continue
      }
  
      // إضافة راحة قصيرة بعد الجلسة (إذا لم تكن الجلسة الأخيرة)
      if (i < sessions.length - 1) {
        // تحديد نوع الراحة: قصيرة أم طويلة
        let breakDuration = shortBreak
        let breakTitle = 'راحة قصيرة'
        let breakType: 'break' | 'long-break' = 'break'
  
        // إذا وصلنا لعدد الجلسات المحدد للراحة الطويلة
        if (consecutiveStudySessions % longBreakAfter === 0 && consecutiveStudySessions > 0) {
          breakDuration = longBreakDuration
          breakTitle = 'راحة طويلة'
          breakType = 'long-break'
        }
  
        const breakStart = currentMin
        const breakEnd = Math.min(breakStart + breakDuration, endMin)
  
        if (breakEnd > breakStart) {
          result.push({
            day: date,
            time_start: minutesToTime(breakStart),
            time_end: minutesToTime(breakEnd),
            title: breakTitle,
            type: breakType,
            project_id: null,
          })
          currentMin = breakEnd
        }
      }
    }
  
    // إذا بقي وقت بعد آخر جلسة، نضيفه كوقت حر
    if (currentMin < endMin) {
      const remaining = endMin - currentMin
      if (remaining > 5) {
        result.push({
          day: date,
          time_start: minutesToTime(currentMin),
          time_end: minutesToTime(endMin),
          title: 'وقت حر',
          type: 'break',
          project_id: null,
        })
      }
    }
  
    return result
  }
  
  // ============================================================
  //  دوال مساعدة
  // ============================================================
  
  function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
  }
  
  function minutesToTime(min: number): string {
    const h = Math.floor(min / 60)
    const m = Math.floor(min % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }