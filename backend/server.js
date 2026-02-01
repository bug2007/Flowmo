const express = require('express');
const cors = require('cors');
const app = express();
const pool = require('./src/db');
const authRoutes = require('./src/routes/auth');
const workflowRoutes = require('./src/routes/workflows');  
const taskRoutes = require('./src/routes/tasks');
const authenticateToken = require('./src/middleware/auth');  

app.use(cors());
app.use(express.json()); // middleware to parse JSON bodies. Think of middleware like airport security: Request arrives, Middleware checks/processes it (parse JSON, check authentication, log data), Request continues to your route

// Routes
app.use('/api/auth', authRoutes);  // in auth.js, u have router.post('/signup'), so the full path becomes /api/auth/signup)
app.use('/api/workflows', workflowRoutes);  
app.use('/api/tasks', taskRoutes);

// // Protected test route (requires login -> gonna authenticate using authentication middleware using jwt.verify())
// app.get('/api/protected', authenticateToken, (req, res) => {
//   res.json({ 
//     message: 'You have access to protected data!',
//     userId: req.user.userId 
//   });
// });


app.get('/health', (req, res) => {  //chrome browser is the client. everytume u enter a website address, chrome sends a get req (reqs are made by client). client asks server for data. fetch() also sends a get req by default.
  res.json({ status: "ok" });
});

app.get('/db-test', async (req, res) => { // async allows using await for the database query

  try {
    const result = await pool.query('SELECT NOW()');  // waits for the query to finish
    res.json({ dbTime: result.rows[0] });   // responds with the first row of result.
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB connection failed" });
  }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

