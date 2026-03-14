import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import toursRouter from './routes/tours.js';
import healthRouter from './routes/health.js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 8080;

// --- Security ---
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for React
    crossOriginEmbedderPolicy: false,
}));

// --- Rate limiting ---
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// --- Middleware ---
app.use(compression());
app.use(express.json());

// --- API Routes ---
app.use('/api', toursRouter);
app.use('/api', healthRouter);

// --- Serve static files (production) ---
const distPath = join(__dirname, '..', '..', 'dist');
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
});

// --- Global Error Handler ---
app.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.url}:`, err.message);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message,
    });
});

// --- Start Server ---
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on port ${PORT}`);
});

// --- Graceful Shutdown ---
const shutdown = () => {
    console.log('[Server] Shutting down gracefully...');
    server.close(() => {
        console.log('[Server] Closed.');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
