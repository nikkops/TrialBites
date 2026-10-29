// Supabase Edge Function: scan-label
//
// Receives a photo of food from the app, looks up the logged-in user's unsafe
// foods, and asks Gemini which foods in the photo are, or may contain, one of
// them. (The slug is still "scan-label" from when it only read labels; a
// readable package label in the photo is still used.)
// It runs on Supabase's servers, so the Gemini API key never reaches the browser.
//
// Secrets it needs (Edge Functions -> Secrets in the Supabase dashboard):
//   GEMINI_API_KEY  - your key from Google AI Studio
//   GEMINI_MODEL    - optional, defaults to gemini-3.8-flash
//   GEMINI_FALLBACK_MODEL - optional, tried once if the main model stays busy
//                           or hits its usage limit (it has a separate limit)
//   ALLOWED_ORIGINS - optional, comma-separated sites allowed to call this
//                     function from a browser (defaults below)
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'

// Which websites may call this function from a browser (CORS).
// Only the live app and the local dev server, not "*" (any site).
const allowedOrigins = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  'https://trial-bites.vercel.app,http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Builds the CORS headers for one request. A browser on any other site
// gets no Access-Control-Allow-Origin header, so it can't read the response.
function corsHeadersFor(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // The answer depends on the Origin header, so caches must not mix them up
    Vary: 'Origin',
  }
  const origin = req.headers.get('Origin') ?? ''
  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(cors: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Base64 grows a file by about a third; this allows roughly a 6 MB image.
// The app shrinks photos before sending, so real requests are much smaller.
const MAX_IMAGE_CHARS = 8_000_000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// How sure Gemini is that an unsafe food is in the photo, strongest first
const CERTAINTIES = ['seen', 'likely', 'possible']

// The JSON shape we ask Gemini to answer in. Gemini fills the fields in
// this order, so "recognized" comes last: it looks at the photo first and
// only then judges whether it could identify anything.
const resultSchema = {
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      items: { type: 'string' },
      description: 'The foods, dishes or products visible in the photo, most prominent first',
    },
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            description: 'The food in the photo that is or may contain the unsafe food',
          },
          allergen: {
            type: 'string',
            description: "Which of the user's unsafe foods it is or may contain",
          },
          certainty: {
            type: 'string',
            enum: CERTAINTIES,
            description:
              'seen = visible or named on a label in the photo; likely = this food usually contains it; possible = it sometimes contains it',
          },
          reason: {
            type: 'string',
            description:
              'Short reason, e.g. "whole almonds are visible" or "macarons are usually made with almond flour"',
          },
        },
        required: ['item', 'allergen', 'certainty', 'reason'],
      },
    },
    recognized: {
      type: 'boolean',
      description:
        'true if you could identify any food in the photo; false if no food is visible or the photo is too unclear',
    },
  },
  required: ['foods', 'matches', 'recognized'],
}

// Gemini statuses that mean "overloaded, try again soon": 500 internal,
// 503 overloaded, 504 timed out.
const OVERLOADED_STATUSES = [500, 503, 504]

// How long one Gemini attempt may take. Supabase stops a function after
// 150s, so two slow attempts (main + fallback) must fit inside that.
const ATTEMPT_TIMEOUT_MS = 45_000

// 429 means a usage limit was hit (per minute or per day). Retrying the same
// model right away only uses up more of the limit, so we don't; we go straight
// to GEMINI_FALLBACK_MODEL instead, which has its own separate limit.
const QUOTA_STATUS = 429

// Wait this long before each retry (1st retry after 1s, 2nd after 3s)
const RETRY_DELAYS_MS = [1_000, 3_000]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callModel(model: string, apiKey: string, body: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        // Don't let one slow attempt hang forever
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    )
    // Remember which model answered, for the log line after a scan
    const headers = new Headers(response.headers)
    headers.set('x-model-used', model)
    return new Response(response.body, { status: response.status, headers })
  } catch (error) {
    // A timed-out attempt counts as "overloaded" (504). It is marked so
    // askGemini doesn't retry the same slow model.
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.warn(`${model} timed out after ${ATTEMPT_TIMEOUT_MS / 1000}s`)
      return new Response(null, { status: 504, headers: { 'x-timed-out': '1' } })
    }
    throw error
  }
}

// Calls Gemini, retrying when it's overloaded. If the main model is still
// overloaded, or has hit its usage limit, tries GEMINI_FALLBACK_MODEL once
// (if that secret is set). Returns the last response, successful or not.
async function askGemini(apiKey: string, body: string) {
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL')

  let response = await callModel(model, apiKey, body)
  for (const delay of RETRY_DELAYS_MS) {
    if (!OVERLOADED_STATUSES.includes(response.status)) break
    // A timeout already used up its time; retrying the same model would
    // likely be just as slow, so move on to the fallback instead
    if (response.headers.get('x-timed-out')) break
    console.warn(`${model} overloaded (${response.status}), retrying in ${delay}ms`)
    await response.body?.cancel() // we won't read this one
    await sleep(delay)
    response = await callModel(model, apiKey, body)
  }

  const shouldFallBack =
    response.status === QUOTA_STATUS || OVERLOADED_STATUSES.includes(response.status)
  if (fallbackModel && shouldFallBack) {
    console.warn(`${model} returned ${response.status}, trying fallback ${fallbackModel}`)
    await response.body?.cancel()
    response = await callModel(fallbackModel, apiKey, body)
  }
  return response
}

// Turns a failed Gemini response into a message for the app.
// Gemini errors look like { error: { code, status, message } }.
function explainGeminiError(status: number, bodyText: string) {
  let googleStatus = ''
  let googleMessage = ''
  try {
    const parsed = JSON.parse(bodyText)
    googleStatus = parsed?.error?.status ?? ''
    googleMessage = parsed?.error?.message ?? ''
  } catch {
    // Not JSON (e.g. our own 504 for a timeout); use the status code alone
  }

  if (status === QUOTA_STATUS) {
    return {
      status: 429,
      error:
        'The scanner has reached its Gemini usage limit. Try again later; daily limits reset at midnight Pacific time.',
    }
  }
  if (OVERLOADED_STATUSES.includes(status)) {
    return { status: 503, error: 'The scanner is busy right now. Wait a minute and try again.' }
  }
  if (status === 404) {
    return {
      status: 502,
      error: 'The Gemini model set for the scanner was not found. Check the GEMINI_MODEL secret.',
    }
  }
  if (
    status === 401 ||
    status === 403 ||
    googleStatus === 'PERMISSION_DENIED' ||
    /api key/i.test(googleMessage)
  ) {
    return {
      status: 502,
      error:
        "The scanner's Gemini API key was rejected. Check GEMINI_API_KEY and the key's restrictions in Google AI Studio.",
    }
  }
  return { status: 502, error: 'The scanner is unavailable right now. Try again later.' }
}

function buildPrompt(allergens: string[]) {
  return `You are looking at a photo of food for someone doing food elimination trials.

Their unsafe foods are: ${allergens.join(', ')}.

1. In "foods", list the foods, dishes or products you can see, most prominent first (for example "Whole almonds" or "Chocolate chip cookie"). If a package label or ingredient list is readable in the photo, use it too.
2. In "matches", add an entry for each unsafe food that is or may be in what you see:
   - "item": the food in the photo
   - "allergen": the unsafe food's name exactly as given above
   - "certainty": "seen" if you can see it directly or it is named on a label in the photo; "likely" if this kind of food usually contains it; "possible" if it sometimes contains it or is often made alongside it
   - "reason": a short explanation, mentioning other forms it may be in (for example almond flour or marzipan for almond; butter, cheese or whey for milk)
3. Set "recognized" to true if you could identify any food, or false if no food is visible or the photo is too unclear.
Never say a food is safe. A photo cannot show every ingredient, so only report what you see or what such foods typically contain.`
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req)

  // Browsers send an OPTIONS "preflight" request before the real one
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json(cors, { error: 'Use POST.' }, 405)

  try {
    // 1. Who is calling? Reuse their login token, so database queries
    //    below run as them and Row Level Security still applies.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData.user) {
      return json(cors, { error: 'Please log in to use the scanner.' }, 401)
    }

    // 2. Check the request
    const { image, mimeType } = await req.json()
    if (typeof image !== 'string' || image.length === 0) {
      return json(cors, { error: 'No image was sent.' }, 400)
    }
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return json(cors, { error: 'Use a JPG, PNG or WebP image.' }, 400)
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return json(cors, { error: 'That image is too large.' }, 413)
    }

    // Confirms in the logs that a real JPEG/PNG/WebP arrived (JPEG base64
    // starts with "/9j/", PNG with "iVBOR"). Logs only size and format.
    console.log(
      `Image received: ${mimeType}, ~${Math.round((image.length * 3) / 4 / 1024)} KB, ` +
        `starts with ${image.slice(0, 5)}`,
    )

    // 3. Their unsafe foods. RLS means this only returns their own trials.
    const { data: trials, error: trialsError } = await supabase
      .from('trials')
      .select('food_name')
      .eq('status', 'unsafe')
    if (trialsError) throw trialsError

    const allergens = [...new Set(trials.map((t) => t.food_name))]
    console.log(`Checking against ${allergens.length} unsafe food(s)`)
    if (allergens.length === 0) {
      // Nothing to compare against, so don't spend a Gemini request
      return json(cors, { recognized: null, foods: [], matches: [], allergensChecked: [] })
    }

    // 4. Ask Gemini
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set for this function.')

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: image } },
            { text: buildPrompt(allergens) },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: resultSchema,
        // Gemini 3 models think at "high" by default, which made scans
        // take over 30s. Naming foods in a photo is simple; "low" is much faster.
        thinkingConfig: { thinkingLevel: 'low' },
      },
    })

    const geminiResponse = await askGemini(apiKey, requestBody)

    if (!geminiResponse.ok) {
      // Log Gemini's full error for you (Edge Functions -> Logs),
      // but only send a short message to the browser
      const errorText = await geminiResponse.text()
      console.error('Gemini error', geminiResponse.status, errorText)
      const { status, error } = explainGeminiError(geminiResponse.status, errorText)
      return json(cors, { error }, status)
    }

    const geminiData = await geminiResponse.json()
    const text: string =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? '')
        .join('') ?? ''

    // Strip ```json fences in case the model adds them anyway
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))

    // 5. Only keep matches for foods the user actually marked unsafe,
    //    spelled the way they wrote them, strongest certainty first
    type RawMatch = { item?: unknown; allergen?: unknown; certainty?: unknown; reason?: unknown }
    const byLowerName = new Map(allergens.map((name) => [name.toLowerCase(), name]))
    const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
      .filter((m: RawMatch) => byLowerName.has(String(m.allergen).toLowerCase()))
      .map((m: RawMatch) => ({
        item: String(m.item ?? ''),
        allergen: byLowerName.get(String(m.allergen).toLowerCase()),
        // Anything unexpected is treated as the weakest level, not dropped
        certainty: CERTAINTIES.includes(String(m.certainty)) ? String(m.certainty) : 'possible',
        reason: m.reason ? String(m.reason) : '',
      }))
      .sort(
        (a: { certainty: string }, b: { certainty: string }) =>
          CERTAINTIES.indexOf(a.certainty) - CERTAINTIES.indexOf(b.certainty),
      )

    const foods: string[] = Array.isArray(parsed.foods) ? parsed.foods.map(String) : []

    // A short summary in the logs, so a "couldn't recognize" result can be
    // told apart from a model problem. No photo contents are logged.
    console.log(
      `Scan done by ${geminiResponse.headers.get('x-model-used')}: recognized=${parsed.recognized}, ` +
        `${foods.length} foods, ${matches.length} matches`,
    )

    return json(cors, {
      // If the model named any foods, it did recognize something, even if
      // it also said "not recognized" (e.g. part of the photo was blurry)
      recognized: parsed.recognized !== false || foods.length > 0,
      foods,
      matches,
      allergensChecked: allergens,
    })
  } catch (error) {
    console.error(error)
    return json(cors, { error: 'Something went wrong while scanning. Try again.' }, 500)
  }
})
