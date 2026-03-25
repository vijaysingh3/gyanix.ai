export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    console.log('[DEBUG] Method not allowed:', req.method)
    return new Response(JSON.stringify({ error: 'Method not allowed', received_method: req.method }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  try {
    console.log('[DEBUG] Received request to /api/chat')
    
    const body = await req.json()
    console.log('[DEBUG] Request body:', JSON.stringify(body, null, 2))
    
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      console.log('[DEBUG] Invalid messages format:', messages)
      return new Response(JSON.stringify({ 
        error: 'Invalid messages format',
        received: messages,
        expected_format: { messages: [{ role: 'user', content: 'your message' }] }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // ✅ Vercel env variable name: x_url_api
    const apiKey = process.env.x_url_api
    console.log('[DEBUG] API Key status:', apiKey ? '✅ Present (length: ' + apiKey.length + ')' : '❌ MISSING')
    console.log('[DEBUG] API Key first 8 chars:', apiKey ? apiKey.substring(0, 8) + '...' : 'N/A')

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured in Vercel',
        fix: 'Go to Vercel Dashboard > Settings > Environment Variables > Add "x_url_api"',
        current_env_keys: Object.keys(process.env).filter(k => k.includes('api') || k.includes('API') || k.includes('key') || k.includes('KEY'))
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    console.log('[DEBUG] Calling Sarvam AI API...')
    
    // Call Sarvam AI with streaming
    const sarvamResponse = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    })

    console.log('[DEBUG] Sarvam API response status:', sarvamResponse.status, sarvamResponse.statusText)
    console.log('[DEBUG] Sarvam API response headers:', Object.fromEntries(sarvamResponse.headers.entries()))

    if (!sarvamResponse.ok) {
      const errorText = await sarvamResponse.text()
      console.log('[DEBUG] Sarvam API error response:', errorText)
      return new Response(
        JSON.stringify({ 
          error: `Sarvam API error: ${sarvamResponse.status} ${sarvamResponse.statusText}`, 
          detail: errorText,
          debug: {
            status: sarvamResponse.status,
            statusText: sarvamResponse.statusText,
            headers: Object.fromEntries(sarvamResponse.headers.entries()),
          }
        }),
        { 
          status: sarvamResponse.status, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    console.log('[DEBUG] Sarvam API call successful, starting stream...')

    // Stream the response back to client
    const stream = new ReadableStream({
      async start(controller) {
        console.log('[DEBUG] Stream started, reading Sarvam response...')
        const reader = sarvamResponse.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('[DEBUG] Stream finished (done=true)')
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            console.log('[DEBUG] Received chunk from Sarvam:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''))
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim()
                if (data === '[DONE]') {
                  console.log('[DEBUG] Received [DONE] from Sarvam')
                  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
                  continue
                }
                try {
                  const parsed = JSON.parse(data)
                  console.log('[DEBUG] Parsed SSE data:', JSON.stringify(parsed))
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    console.log('[DEBUG] Sending content to client:', content)
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`)
                    )
                  }
                } catch (parseErr) {
                  console.log('[DEBUG] Parse error for SSE data:', parseErr.message, 'Raw data:', data)
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (err) {
          console.log('[DEBUG] Stream error:', err.message)
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: err.message, stack: err.stack })}\n\n`)
          )
        } finally {
          console.log('[DEBUG] Closing stream')
          controller.close()
        }
      },
    })

    console.log('[DEBUG] Returning stream response to client')
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.log('[DEBUG] Unhandled error in /api/chat:', err.message, err.stack)
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
}
