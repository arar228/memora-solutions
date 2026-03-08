import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';

import { pool } from './backend/db.js';
import { startCronParser } from './backend/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080; // Railway dynamic port

app.use(compression());

// --- API ROUTES ---
app.get('/api/tours', async (req, res) => {
    try {
        const { destination, minStars, maxBudget, sortBy } = req.query;

        let queryStr = 'SELECT * FROM tours WHERE 1=1';
        const values = [];
        let paramIndex = 1;

        if (destination) {
            queryStr += ` AND destination = $${paramIndex++}`;
            values.push(destination);
        }

        if (minStars && minStars !== '0') {
            queryStr += ` AND stars >= $${paramIndex++}`;
            values.push(parseInt(minStars, 10));
        }

        if (maxBudget) {
            queryStr += ` AND price <= $${paramIndex++}`;
            values.push(parseInt(maxBudget, 10));
        }

        switch (sortBy) {
            case 'price':
                queryStr += ' ORDER BY price ASC';
                break;
            case 'discount':
                queryStr += ' ORDER BY discount DESC';
                break;
            case 'stars':
                queryStr += ' ORDER BY stars DESC';
                break;
            case 'date':
                queryStr += ' ORDER BY "departureDate" ASC';
                break;
            default:
                queryStr += ' ORDER BY discount DESC';
                break;
        }

        const result = await pool.query(queryStr, values);

        // Simulate real-world Sletat aggregator delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        res.json(result.rows);
    } catch (err) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Serve static files from the React app build directory
app.use(express.static(join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    startCronParser();
});
