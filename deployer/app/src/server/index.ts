import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import router from './routes.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// API routes
app.use(router);

// Serve static files from public directory (if exists)
const publicPath = join(__dirname, '..', '..', 'public');
app.use(express.static(publicPath));

// Serve compiled client JavaScript files from dist/client
const distClientPath = join(__dirname, '..', 'client');
app.use('/client', express.static(distClientPath));

// Serve client assets (CSS, HTML) from src/client
const srcClientPath = join(__dirname, '..', '..', 'src', 'client');
app.use('/client', express.static(srcClientPath));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(join(srcClientPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Deployer server running on http://localhost:${PORT}`);
  logger.info(`Open your browser to http://localhost:${PORT} to get started`);
});
