require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT title, insurance FROM \"Evento\" WHERE title LIKE '%Medio Tejo%' LIMIT 1")
    .then(res => { console.log(res.rows[0]); pool.end(); })
    .catch(err => { console.error(err); pool.end(); });
