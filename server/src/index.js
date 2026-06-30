import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js'; // initialises the schema on import
import { MOCK_MODE } from './payments.js';
import authRouter from './routes/auth.js';
import requestsRouter from './routes/requests.js';
import offersRouter from './routes/offers.js';
import paymentsRouter from './routes/payments.js';
import operatorRouter from './routes/operator.js';

const app = express();

const origins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, mockPayments: MOCK_MODE }));

// Auth
app.use('/api/auth', authRouter);
// Requests CRUD + transitions + messages (most specific mount first)
app.use('/api/requests', requestsRouter);
// Resource routers that declare their own full sub-paths under /api
app.use('/api', offersRouter);
app.use('/api', paymentsRouter);
app.use('/api', operatorRouter);

// 404 + error handler
app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({ error: 'internal error' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Memora Concierge API listening on :${PORT}  (mock payments: ${MOCK_MODE})`);
});
