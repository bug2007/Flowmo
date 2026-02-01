const pool = require('../src/db');

async function test() {  // async means this func can use await inside it
  try {
    const res = await pool.query('SELECT * FROM workflows');  // wait to get all rows from workflows table
    console.log('Workflows table reachable');
    console.log('Number of rows:', res.rowCount);
    console.log('Rows:', res.rows);
    process.exit(0);  // exit successfully. without this, program wud hang cuz database connection stays open
  } catch (err) {
    console.error('Error:', err);  
    process.exit(1);  // stops the program. exit with error.
  }
}

test();