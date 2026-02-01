const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
// without JWT, every req (e.g GET /api/workflows) will need password. cuz HTTP is stateless. doesnt remember who u r in between reqs.gonna use jwt Authentication middlware (jwt.verify()) to check if users are logged in before they can access protected rotes like GET /api/workflows. otherwise, anyone can access protected routes like GET /api/workflows without logging in.
const jwt = require('jsonwebtoken');  
const pool = require('../db');

// Secret key for JWT 
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Sign Up
router.post('/signup', async (req, res) => {   // post req for creating new user. how does it become a post req: in ur test-auth.js, see method: 'POST' thats how.
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',   //  PostgreSQL sees: INSERT INTO users (email, password_hash, name) VALUES ('bob@example.com', 'hashed_password_123', 'Bob Smith'). $1 → first item in array → email → 'bob@example.com'
      [email, password_hash, name]  // result is an obj that looks like:
      // {
      //    rows: [
      //         { id: 1, email: 'test@example.com', name: 'Test User' }
      //    ]
      //    rowCount: 1
      // }

    );

    const user = result.rows[0];

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;