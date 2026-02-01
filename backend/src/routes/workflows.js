const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// ALL ROUTES HERE REQUIRE AUTHENTICATION 
router.use(authenticateToken);

// Get all workflows for the logged-in user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT token. remember all routes here r using authenticateToken middleware.
    
    const result = await pool.query(
      'SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ workflows: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new workflow
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT token
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO workflows (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    
    res.status(201).json({ 
      message: 'Workflow created successfully',
      workflow: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific workflow by workflowID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const workflowId = req.params.id;
    
    const result = await pool.query(
      'SELECT * FROM workflows WHERE id = $1 AND user_id = $2',  // to prevent User A from accessing User B's workflow #10.
      [workflowId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json({ workflow: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a workflow
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId;
    const workflowId = req.params.id;
    
    const result = await pool.query(
      'DELETE FROM workflows WHERE id = $1 AND user_id = $2 RETURNING *',
      [workflowId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json({ 
      message: 'Workflow deleted successfully',
      workflow: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;