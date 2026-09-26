// supabase/functions/jadwool/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

declare namespace Deno {
  const env: { get(name: string): string | undefined }
  function serve(handler: (req: Request) => Response | Promise<Response>): void
}

// ==================== Types ====================
type DraftTask = { name: string; category: string; duration_minutes: number }
type DraftSideTask = { name: string }
type ScheduleDraft = {
  title: string
  date: string
  start_time: string
  tasks: DraftTask[]
  sideTasks?: DraftSideTask[]
  notes?: string
}
type JadwoolResponse =
  | { type: 'question'; message: string; options?: string[] }
  | { type: 'schedule'; schedule: ScheduleDraft; message?: string }

// ==================== Time repair (server-side) ====================
function repairTime(input: unknown, fallback = '08:00'): string {
  if (typeof input !== 'string') return fallback
  const s = input.trim().toLowerCase()
  if (!s) return fallback

  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)$/)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10)
    const m = parseInt(ampmMatch[2] || '0', 10)
    const isPM = /pm|م$|مساء/.test(ampmMatch[3])
    if (isPM && h < 12) h += 12
    if (!isPM && h === 12) h = 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  const hhmmMatch = s.match(/^(\d{1,2}):(\d{1,2})$/)
  if (hhmmMatch) {
    const h = parseInt(hhmmMatch[1], 10)
    const m = parseInt(hhmmMatch[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  const hourOnly = s.match(/^(\d{1,2})$/)
  if (hourOnly) {
    const h = parseInt(hourOnly[1], 10)
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, '0')}:00`
  }

  return fallback
}

function isValidDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d)
}

// ==================== Normalize draft ====================
function normalizeDraft(draft: any, fallbackDate: string): ScheduleDraft {
  const date = isValidDate(draft.date) ? draft.date : fallbackDate
  const tasks: DraftTask[] = Array.isArray(draft.tasks)
    ? draft.tasks
        .filter((t: any) => t && typeof t.name === 'string' && t.name.trim())
        .slice(0, 20)
        .map((t: any) => ({
          name: String(t.name).trim().slice(0, 200),
          category: String(t.category || 'عام').trim().slice(0, 60),
          duration_minutes: Math.max(
            5,
            Math.min(720, Math.round(Number(t.duration_minutes) || 30))
          ),
        }))
    : []

  const sideTasks: DraftSideTask[] = Array.isArray(draft.sideTasks)
    ? draft.sideTasks
        .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
        .slice(0, 20)
        .map((s: any) => ({ name: String(s.name).trim().slice(0, 200) }))
    : []

  return {
    title: String(draft.title || 'جدول يومي').trim().slice(0, 200),
    date,
    start_time: repairTime(draft.start_time, '08:00'),
    tasks,
    sideTasks,
    notes:
      typeof draft.notes === 'string' && draft.notes.trim()
        ? draft.notes.trim().slice(0, 500)
        : undefined,
  }
}

// ==================== System prompt ====================
function buildSystemPrompt(suggestedDate: string): string {
  return `
أنت "جَدْوُولْ" (Jadwool)، مساعد ذكي وديناميكي داخل تطبيق "جَدْوَلِي" لتنظيم الوقت.

## 🎯 دورك:
1. **افهم** طلب المستخدم بدقة.
2. **اسأل** أسئلة توضيحية عند نقص المعلومات المهمة.
3. **اقترح** جدولاً منظماً عندما تتوفر معلومات كافية.

## 💡 متى تسأل (type: "question")؟
اسأل عندما يكون هناك **غموض حقيقي** يمنع بناء جدول جيد:
- المستخدم لم يذكر **أي مهام** (مثل: "رتب يومي" فقط).
- المستخدم لم يذكر **مدة** أي مهمة.
- المستخدم ذكر مهمة **غير واضحة** (مثل: "شيء للدراسة").
- المعلومات متناقضة أو غير كافية.

**لا تسأل عن أشياء ثانوية.** اجعل سؤالك:
- **واحداً فقط** في كل مرة.
- **محدداً** ومفيداً.
- مع **خيارات مقترحة** إن أمكن (2-4 خيارات).

## ✅ متى تقدم جدولاً (type: "schedule")؟
عندما تعرف على الأقل:
- ماذا يريد أن يفعل (المهام).
- أو على الأقل فكرة عامة واضحة.

يمكنك **تخمين مدة معقولة** إذا لم تُذكر (ساعة افتراضياً).

## 📋 قواعد التصنيف:
### المهام الأساسية (tasks):
- الدراسة، العمل، الاجتماعات، المشاريع، الرياضة، التمارين
- أي شيء **يحتاج تركيزاً** ويستغرق **15 دقيقة أو أكثر**

### الأعمال الجانبية (sideTasks):
- قراءة صفحة، مراجعة سريعة، شرب ماء، أذكار، مكالمة قصيرة
- أي شيء **صغير جداً** أو **غير محدد بوقت**

**القاعدة:** إذا كان له وقت → مهمة أساسية. إذا لا → عمل جانبي.

## ⏰ صيغة الوقت (إجبارية):
- **HH:MM بنظام 24 ساعة فقط.**
- **صحيح:** "08:00"، "14:30"، "23:15"
- **خطأ (يجب تجنبه):** "3333333"، "8"، "3:5"، "8 PM"، "25:00"
- **التحويل الصحيح:**
  - "8 صباحاً" → "08:00"
  - "3 عصراً" → "15:00"
  - "8 مساءً" → "20:00"
  - "نصف الليل" → "00:00"
- الساعات من 00 إلى 23، الدقائق من 00 إلى 59.

## 📤 صيغة الرد (JSON فقط، بدون أي شيء آخر):

### إذا كنت تسأل سؤالاً:
\`\`\`json
{
  "type": "question",
  "message": "نص السؤال بالعربية",
  "options": ["خيار 1", "خيار 2", "خيار 3"]
}
\`\`\`

### إذا كنت تقدم جدولاً:
\`\`\`json
{
  "type": "schedule",
  "message": "جملة قصيرة مثل: إليك جدولك المقترح",
  "schedule": {
    "title": "عنوان الجدول",
    "date": "${suggestedDate}",
    "start_time": "08:00",
    "tasks": [
      { "name": "مذاكرة رياضيات", "category": "دراسة", "duration_minutes": 120 }
    ],
    "sideTasks": [
      { "name": "شرب ماء" }
    ],
    "notes": "ملاحظة اختيارية"
  }
}
\`\`\`

## ⚠️ قواعد صارمة:
- **لا تُرجع أي شيء خارج JSON.** لا شرح، لا Markdown، لا تعليقات.
- **لا تقل "تم الحفظ"** — أنت تقترح فقط.
- إذا كان الطلب غامضاً جداً، اسأل سؤالاً واحداً واضحاً.
- إذا كان الطلب واضحاً بما يكفي، اقترح الجدول مباشرة.
- استخدم نفس لغة المستخدم (العربية افتراضياً).
- لا تكرر نفس السؤال إذا سألته سابقاً — اعتمد على إجابة المستخدم.

## 📅 التاريخ: ${suggestedDate}
`.trim()
}

// ==================== Handler ====================
Deno.serve(async (request: Request) => {
  const allowedOrigins = (
    Deno.env.get('ALLOWED_ORIGINS') ||
    'https://jadwaly-hgz.vercel.app,http://localhost:3000'
  )
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

  const origin = request.headers.get('origin') || ''

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }

  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers })

  if (request.method === 'OPTIONS') return new Response(null, { headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  if (origin && !allowedOrigins.includes(origin))
    return reply({ error: 'Origin not allowed' }, 403)

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer '))
    return reply({ error: 'Sign in required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const groqKey = Deno.env.get('GROQ_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey)
    return reply({ error: 'Supabase not configured' }, 500)
  if (!groqKey) return reply({ error: 'GROQ_API_KEY missing' }, 503)

  try {
    // التحقق من المستخدم
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authorization,
        apikey: supabaseAnonKey,
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!authResponse.ok) return reply({ error: 'Sign in required' }, 401)

    const rawBody = await request.text()
    if (rawBody.length > 30000)
      return reply({ error: 'Conversation too long' }, 400)

    const input = JSON.parse(rawBody)

    if (
      !Array.isArray(input.messages) ||
      input.messages.length < 1 ||
      input.messages.length > 16 ||
      input.messages.some(
        (m: any) =>
          !['user', 'assistant'].includes(m.role) ||
          typeof m.content !== 'string' ||
          m.content.length > 3000
      )
    ) {
      return reply({ error: 'Invalid conversation' }, 400)
    }

    const suggestedDate = String(
      input.date || new Date().toISOString().slice(0, 10)
    ).slice(0, 10)

    // استدعاء Groq
    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          temperature: 0.4,
          max_tokens: 2500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: buildSystemPrompt(suggestedDate) },
            ...input.messages,
          ],
        }),
      }
    )

    if (!groqResponse.ok) {
      const txt = await groqResponse.text()
      console.error('Groq error:', txt)
      return reply({ error: 'Groq failed' }, 502)
    }

    const groqBody = await groqResponse.json()
    const content = groqBody.choices?.[0]?.message?.content
    if (!content) return reply({ error: 'Empty Groq response' }, 502)

    // استخراج JSON
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      const match = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (match) {
        try {
          parsed = JSON.parse(match[1])
        } catch {
          return reply({ error: 'Invalid JSON' }, 422)
        }
      } else {
        return reply({ error: 'Invalid JSON' }, 422)
      }
    }

    // ✅ معالجة النوعين
    if (parsed.type === 'question') {
      if (typeof parsed.message !== 'string' || !parsed.message.trim()) {
        return reply({ error: 'Invalid question format' }, 422)
      }
      const response: JadwoolResponse = {
        type: 'question',
        message: parsed.message.trim(),
        options: Array.isArray(parsed.options)
          ? parsed.options
              .filter((o: any) => typeof o === 'string' && o.trim())
              .slice(0, 4)
          : undefined,
      }
      return reply({ response })
    }

    // ⚠️ دعم احتياطي: إذا لم يُحدد type لكن أعطى جدولاً مباشراً
    const rawSchedule = parsed.schedule || parsed
    if (!rawSchedule.tasks || !Array.isArray(rawSchedule.tasks)) {
      return reply({ error: 'Missing tasks' }, 422)
    }

    const normalized = normalizeDraft(rawSchedule, suggestedDate)

    if (normalized.tasks.length === 0) {
      return reply({ error: 'No valid tasks' }, 422)
    }

    const response: JadwoolResponse = {
      type: 'schedule',
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      schedule: normalized,
    }
    return reply({ response })
  } catch (error: any) {
    console.error('Jadwool error:', error)
    return reply({ error: error?.message || 'Request failed' }, 502)
  }
})