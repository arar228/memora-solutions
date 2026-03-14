import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/tours', async (req, res, next) => {
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

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
});

export default router;
