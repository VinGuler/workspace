import express, { type Express } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { log } from '@workspace/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// In production, __dirname is dist/, in dev it's src/
// Static files are always in dist/public (built by client)
const publicPath = path.join(__dirname, 'public');
const hasPublicDir = fs.existsSync(publicPath);

if (hasPublicDir) {
  // Serve static files from the client build
  app.use(express.static(publicPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // Dev mode without built client - show template info
  app.get('/', (_req, res) => {
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Server</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; margin-top: 4rem; }
    .app { text-align: center; }
    h1 { margin: 0.5rem 0 0.25rem; }
    .description { color: #666; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="app">
    <h1>API Server</h1>
    <p class="description">Backend-only Express API server template</p>
  </div>
</body>
</html>`);
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  log('info', 'api-server', `Server is running on port ${PORT}`);
});

export { app };
