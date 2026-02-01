const { Pool } = require('pg'); //{ Pool } uses destructuring to extract just the Pool class from the postgresql library
require('dotenv').config();


const pool = new Pool({   // create a Pool instance. this creates a new connection pool with ur database credentials
  user: process.env.DB_USER,     // replace with your PostgreSQL username
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, // replace with your PostgreSQL password
  port: process.env.DB_PORT,
});

pool.on('connect', () => {   // listens for successful connection (connection event listener)
  console.log('Connected to PostgreSQL');
});

module.exports = pool;   // makes the pool available to other files
