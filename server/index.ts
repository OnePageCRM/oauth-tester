import 'dotenv/config'
import express, { Request, Response } from 'express'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || 'localhost'

// Proxy request handler - exported for testing
export async function handleProxyRequest(req: Request, res: Response): Promise<void> {
  const { url, method, headers, body } = req.body as {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: string
  }

  // Validate required fields
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid "url" field' })
    return
  }

  // Validate URL format
  try {
    new URL(url)
  } catch {
    res.status(400).json({ error: 'Invalid URL format' })
    return
  }

  try {
    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: body || undefined,
    })

    // Convert headers to plain object
    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    const responseBody = await response.text()

    res.json({
      status: response.status,
      headers: responseHeaders,
      body: responseBody,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(502).json({ error: `Proxy request failed: ${message}` })
  }
}

// Create Express app - exported for testing
export function createApp(): express.Application {
  const app = express()
  app.use(express.json())
  app.post('/api/proxy', handleProxyRequest)
  return app
}

async function createServer() {
  const app = createApp()

  if (isProduction) {
    // Production: serve static files from dist/
    const distPath = resolve(__dirname, '../dist')
    app.use(express.static(distPath))

    // SPA fallback - serve index.html for all non-API routes
    app.use((_req: Request, res: Response) => {
      res.sendFile(resolve(distPath, 'index.html'))
    })
  } else {
    // Development: use Vite middleware
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)

    // SPA fallback for dev - Vite middleware handles index.html automatically
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`)
    if (!isProduction) {
      console.log('Development mode - Vite HMR enabled')
    }
  })
}

createServer().catch(console.error)
