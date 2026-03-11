import { pool } from './backend/db.js';

async function testQuery() {
    try {
        console.log("Testing full query...");
        const queryStr = 'SELECT * FROM tours WHERE 1=1 AND price <= $1 ORDER BY discount DESC';
        const values = [200000];

        const res = await pool.query(queryStr, values);
        console.log("Success! Rows:", res.rows.length);
        process.exit(0);
    } catch (err) {
        console.error("Query failed:", err);
        process.exit(1);
    }
}

testQuery();
