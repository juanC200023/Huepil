import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { pool, closePool } from './src/db.js';
import authRouter from './src/routes/auth.js';
import patientsRouter from './src/routes/patients.js';
import turnosRouter from './src/routes/turnos.js';
import historiasRouter from './src/routes/historias.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', async (req, res) => {
  try {
    const { rows } = await pool.query('select 1 as ok');
    res.json({
      ok: true,
      db: rows[0].ok === 1,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/turnos', turnosRouter);
app.use('/api/historias', historiasRouter);

// Archivos estáticos (sirve index.html, app.js, css, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Fallback: cualquier ruta que no sea /api/* devuelve index.html
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Sistema Huepil escuchando en puerto ${PORT}`);
});
