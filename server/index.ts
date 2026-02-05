import express, { Request, Response } from 'express'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 3000

async function createServer() {
  const app = express()

  app.use(express.json())

  // API routes (before Vite middleware)
  app.post('/api/proxy', async (req: Request, res: Response) => {
    // TODO: Implement in Phase 6.2
    res.status(501).json({ error: 'Not implemented yet' })
  })

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

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
    if (!isProduction) {
      console.log('Development mode - Vite HMR enabled')
    }
  })
}

createServer().catch(console.error)
