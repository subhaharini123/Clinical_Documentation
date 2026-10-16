import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/lib/create-api-app.js';
import { initializeDatabase } from './src/lib/server-database.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer(): Promise<void> {
  await initializeDatabase();
  const app = createApiApp();
  const port = Number.parseInt(process.env.PORT || '3000', 10);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`[ClinicNote AI] Server listening on http://${host}:${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('[ClinicNote AI] Failed to start server:', error);
  process.exit(1);
});
