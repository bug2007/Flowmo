const { Pool } = require('pg'); //{ Pool } uses destructuring to extract just the Pool class from the postgresql library

const pool = new Pool({   // create a Pool instance. this creates a new connection pool with ur database credentials
   connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {   // listens for successful connection (connection event listener)
  console.log('Connected to PostgreSQL');
});

module.exports = pool;   // makes the pool available to other files

