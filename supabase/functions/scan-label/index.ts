// Supabase Edge Function: scan-label
//
// Receives a photo of an ingredient label from the app, looks up the logged-in
// user's unsafe foods, and asks Gemini which ingredients match them.
// It runs on Supabase's servers, so the Gemini API key never reaches the browser.
//
// Secrets it needs (Edge Functions -> Secrets in the Supabase dashboard):
//   GEMINI_API_KEY  - your key from Google AI Studio
//   GEMINI_MODEL    - optional, defaults to gemini-3.8-flash
//   GEMINI_FALLBACK_MODEL - optional, tried once if the main model stays busy
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

// The JSON shape we ask Gemini to answer in
const resultSchema = {
  type: 'object',
  properties: {
    readable: {
      type: 'boolean',
      description:
        'false if the image is not an ingredient list or is too blurry to read',
    },
    ingredients: {
      type: 'array',
      items: { type: 'string' },
      description: 'Every ingredient on the label, as written',
    },
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ingredient: {
            type: 'string',
            description: 'The ingredient exactly as written on the label',
          },
          allergen: {
            type: 'string',
            description: "Which of the user's unsafe foods it matches",
          },
          synonym: {
            type: 'string',
            description:
              'Short reason it matches, e.g. a scientific name or "derived from milk"',
          },
        },
        required: ['ingredient', 'allergen', 'synonym'],
      },
    },
  },
  required: ['readable', 'ingredients', 'matches'],
}

// Gemini statuses that mean "busy, try again soon" rather than "you did
// something wrong": 429 too many requests, 500/503 overloaded, 504 timed out
const BUSY_STATUSES = [429, 500, 503, 504]

// Wait this long before each retry (1st retry after 1s, 2nd after 3s)
const RETRY_DELAYS_MS = [1_000, 3_000]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function callModel(model: string, apiKey: string, body: string) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      // Don't let one slow attempt hang forever
      signal: AbortSignal.timeout(30_000),
    },
  )
}

// Calls Gemini, retrying when it's busy. If the main model is still busy
// after the retries, tries GEMINI_FALLBACK_MODEL once (if that secret is set).
// Returns the last response, successful or not.
async function askGemini(apiKey: string, body: string) {
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash'
  const fallbackModel = Deno.env.get('GEMINI_FALLBACK_MODEL')

  let response = await callModel(model, apiKey, body)
  for (const delay of RETRY_DELAYS_MS) {
    if (!BUSY_STATUSES.includes(response.status)) return response
    console.warn(`Gemini busy (${response.status}), retrying in ${delay}ms`)
    await response.body?.cancel() // we won't read this one
    await sleep(delay)
    response = await callModel(model, apiKey, body)
  }

  if (fallbackModel && BUSY_STATUSES.includes(response.status)) {
    console.warn(`${model} still busy, trying fallback ${fallbackModel}`)
    await response.body?.cancel()
    response = await callModel(fallbackModel, apiKey, body)
  }
  return response
}

function buildPrompt(allergens: string[]) {
  return `You are checking a photo of a food product's ingredient label for someone with food reactions.

Their unsafe foods are: ${allergens.join(', ')}.

1. Read the ingredient list in the image. If the image is not an ingredient label, or it is too blurry to read, set "readable" to false and leave the lists empty.
2. List every ingredient as written in "ingredients".
3. In "matches", list each ingredient that is, contains, or is derived from one of the unsafe foods. Include:
   - direct names and plural/singular forms
   - scientific or botanical names (for example Arachis hypogaea for peanut, Prunus dulcis for almond)
   - derivatives and processed forms (for example casein or whey for milk, albumin for egg)
   - "may contain" or "processed in a facility with" warnings, using the warning text as the ingredient
   For "allergen", use the unsafe food's name exactly as given above.
Only report matches you can see on the label. Do not guess.`
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
      return json(cors, { error: 'Please log in to scan labels.' }, 401)
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

    // 3. Their unsafe foods. RLS means this only returns their own trials.
    const { data: trials, error: trialsError } = await supabase
      .from('trials')
      .select('food_name')
      .eq('status', 'unsafe')
    if (trialsError) throw trialsError

    const allergens = [...new Set(trials.map((t) => t.food_name))]
    if (allergens.length === 0) {
      // Nothing to compare against, so don't spend a Gemini request
      return json(cors, { readable: null, ingredients: [], matches: [], allergensChecked: [] })
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
      },
    })

    const geminiResponse = await askGemini(apiKey, requestBody)

    if (!geminiResponse.ok) {
      // Log Gemini's full error for you (Edge Functions -> Logs),
      // but only send a short message to the browser
      console.error('Gemini error', geminiResponse.status, await geminiResponse.text())
      if (BUSY_STATUSES.includes(geminiResponse.status)) {
        return json(
          cors,
          { error: 'The scanner is busy right now. Wait a minute and try again.' },
          503,
        )
      }
      return json(cors, { error: 'The label scanner is unavailable right now. Try again later.' }, 502)
    }

    const geminiData = await geminiResponse.json()
    const text: string =
      geminiData.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? '')
        .join('') ?? ''

    // Strip ```json fences in case the model adds them anyway
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))

    // 5. Only keep matches for foods the user actually marked unsafe,
    //    spelled the way they wrote them
    const byLowerName = new Map(allergens.map((name) => [name.toLowerCase(), name]))
    const matches = (Array.isArray(parsed.matches) ? parsed.matches : [])
      .filter((m: { allergen?: string }) => byLowerName.has(String(m.allergen).toLowerCase()))
      .map((m: { ingredient: string; allergen: string; synonym?: string }) => ({
        ingredient: String(m.ingredient),
        allergen: byLowerName.get(m.allergen.toLowerCase()),
        synonym: m.synonym ? String(m.synonym) : '',
      }))

    return json(cors, {
      readable: parsed.readable !== false,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.map(String) : [],
      matches,
      allergensChecked: allergens,
    })
  } catch (error) {
    console.error(error)
    return json(cors, { error: 'Something went wrong while scanning. Try again.' }, 500)
  }
})
