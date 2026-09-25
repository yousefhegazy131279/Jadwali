import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

declare namespace Deno {
  const env: {
    get(name: string): string | undefined
  }

  function serve(
    handler: (
      request: Request
    ) => Response | Promise<Response>
  ): void
}
type ScheduleDraft = {
  title: string
  date: string
  start_time: string
  tasks: {
    name: string
    category: string
    duration_minutes: number
  }[]
}

function validateDraft(value: unknown): value is ScheduleDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as ScheduleDraft

  return (
    typeof draft.title === 'string' &&
    draft.title.trim().length > 0 &&
    typeof draft.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
    typeof draft.start_time === 'string' &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start_time) &&
    Array.isArray(draft.tasks) &&
    draft.tasks.length > 0 &&
    draft.tasks.length <= 20 &&
    draft.tasks.every(
      task =>
        typeof task.name === 'string' &&
        task.name.trim().length > 0 &&
        typeof task.category === 'string' &&
        task.category.trim().length > 0 &&
        Number.isInteger(task.duration_minutes) &&
        task.duration_minutes >= 1 &&
        task.duration_minutes <= 720
    ) &&
    draft.tasks.reduce(
      (total, task) => total + task.duration_minutes,
      0
    ) <= 1440
  )
}

Deno.serve(async (request: Request) => {
  const allowedOrigins = (
    Deno.env.get('ALLOWED_ORIGINS') ||
    'https://jadwaly-hgz.vercel.app'
  )
    .split(',')
    .map(origin => origin.trim())

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
    new Response(JSON.stringify(body), {
      status,
      headers,
    })

  if (origin && !allowedOrigins.includes(origin)) {
    return reply({ error: 'Origin is not allowed' }, 403)
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  if (request.method !== 'POST') {
    return reply({ error: 'Method not allowed' }, 405)
  }

  const authorization = request.headers.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return reply({ error: 'Sign in required' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const groqKey = Deno.env.get('GROQ_API_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return reply({ error: 'Supabase is not configured' }, 500)
  }

  if (!groqKey) {
    return reply({ error: 'GROQ_API_KEY is missing' }, 503)
  }

  const authHeaders = {
    Authorization: authorization,
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  }

  try {
    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: authHeaders,
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!authResponse.ok) {
      return reply({ error: 'Sign in required' }, 401)
    }

    const rawBody = await request.text()

    if (rawBody.length > 20000) {
      return reply({ error: 'Conversation is too long' }, 400)
    }

    const input = JSON.parse(rawBody)

    if (
      !Array.isArray(input.messages) ||
      input.messages.length < 1 ||
      input.messages.length > 12 ||
      input.messages.some(
        (message: { role: string; content: string }) =>
          !['user', 'assistant'].includes(message.role) ||
          typeof message.content !== 'string' ||
          message.content.length > 3000
      )
    ) {
      return reply({ error: 'Invalid conversation' }, 400)
    }

    const systemMessage = `
You are Jadwool, a daily planning assistant.

Return ONLY valid JSON using this exact structure:

{
  "title": "string",
  "date": "YYYY-MM-DD",
  "start_time": "HH:mm",
  "tasks": [
    {
      "name": "string",
      "category": "string",
      "duration_minutes": 30
    }
  ]
}

Rules:
- Return between 1 and 20 tasks.
- Each task must be between 1 and 720 minutes.
- Total duration must not exceed 1440 minutes.
- Use the same language as the user.
- Do not use Markdown.
- Do not add explanations outside the JSON.
- Do not claim that anything was saved.
- Suggested date: ${String(input.date || '').slice(0, 10)}
`

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
          temperature: 0.2,
          max_tokens: 2500,
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            ...input.messages,
          ],
          response_format: {
            type: 'json_object',
          },
        }),
      }
    )

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq error:', errorText)
      return reply({ error: 'Groq request failed' }, 502)
    }

    const groqBody = await groqResponse.json()
    const content = groqBody.choices?.[0]?.message?.content

    if (!content) {
      return reply({ error: 'Groq returned an empty response' }, 502)
    }

    const draft = JSON.parse(content)

    if (!validateDraft(draft)) {
      return reply({ error: 'Invalid schedule returned by Groq' }, 422)
    }

    return reply({ draft })
  } catch (error) {
    console.error('Jadwool error:', error)
    return reply({ error: 'Request failed' }, 502)
  }
})  
