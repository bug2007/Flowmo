const express = require('express');
const router = express.Router();
const pool = require('../db');
const taskExecutor = require('../taskExecutor');
const authenticateToken = require('../middleware/auth');
const { addTaskToQueue, getQueueStats, taskQueue } = require('../queueManager');

// ALL ROUTES HERE REQUIRE AUTHENTICATION 
router.use(authenticateToken);

// Get all tasks for a user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks for a specific workflow
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // Verify workflow belongs to user
    const workflowCheck = await pool.query(
      'SELECT id FROM workflows WHERE id = $1 AND user_id = $2',
      [workflowId, req.user.userId]
    );
    
    if (workflowCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE workflow_id = $1 ORDER BY created_at ASC',
      [workflowId]
    );
    
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Error fetching workflow tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task by task ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Get combined stats (queue + database)
router.get('/stats/combined', async (req, res) => {
  try {
    // Get queue stats (real-time)
    const queueStats = await getQueueStats();
    
    // Get database stats (accurate counts)
    const dbStats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM tasks
       WHERE user_id = $1`,
      [req.user.userId]
    );
    
    res.json({ 
      stats: {
        waiting: queueStats.waiting,
        active: queueStats.active,
        success: parseInt(dbStats.rows[0].success),
        failed: parseInt(dbStats.rows[0].failed)
      }
    });
  } catch (error) {
    console.error('Error fetching combined stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Create a new task (saves to DB, doesnt queue yet)
router.post('/', async (req, res) => { 
  try {
    const { workflow_id, task_type, task_name, config, max_retries, priority, scheduled_for } = req.body;
    
    // Validate required fields
    if (!task_type || !task_name || !config) {
      return res.status(400).json({ error: 'Missing required fields: task_type, task_name, config' });
    }
    
    // Validate task_type
    const validTypes = ['http', 'file', 'data', 'email'];
    if (!validTypes.includes(task_type)) {
      return res.status(400).json({ error: 'Invalid task_type. Must be: http, file, data, or email' });
    }
    
    // If workflow_id provided, verify it belongs to user
    if (workflow_id) {
      const workflowCheck = await pool.query(
        'SELECT id FROM workflows WHERE id = $1 AND user_id = $2',
        [workflow_id, req.user.userId]
      );
      
      if (workflowCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
    }
    
    // Insert task with 'pending' status
    const result = await pool.query(
      `INSERT INTO tasks (workflow_id, user_id, task_type, task_name, config, max_retries, status, priority, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [workflow_id || null, req.user.userId, task_type, task_name, config, max_retries || 3, 'pending', priority || 10, scheduled_for]
    );
    
    res.status(201).json({ 
      message: 'Task created successfully',
      task: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // try to remove the task from queue (if it's queued)
    const jobs = await taskQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.id === parseInt(id)) {
        await job.remove();
        console.log(`Removed task ${id} from queue`);
      }
    }
    
    res.json({ message: 'Task deleted successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Execute a task (adds to queue for async execution if user clicks 'Execute')
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the task
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    
    // Check if task is already running or queued
    if (task.status === 'running' || task.status === 'queued') {
      return res.status(400).json({ error: 'Task is already queued or running' });
    }
    
    // Update status to queued
    await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2',
      ['queued', id]
    );
    
    // Add to queue for background execution
    await addTaskToQueue({
      id: task.id,
      task_type: task.task_type,
      config: task.config,
      workflow_id: task.workflow_id,
      priority: task.priority,
      scheduled_for: task.scheduled_for,
    });
    
    res.json({ 
      message: 'Task queued for execution',
      taskId: id,
      status: 'queued'
    });
    
  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({ error: 'Task execution failed', details: error.message });
  }
});

// Retry a failed task. For failed tasks after Bull gave up after 3 auto-retries.
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the task
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    
    // Only retry failed tasks
    if (task.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed tasks can be retried' });
    }
    
    // Update status to queued and clear error
    await pool.query(
      'UPDATE tasks SET status = $1, error_message = NULL WHERE id = $2',
      ['queued', id]
    );
    
    // Add back to queue
    await addTaskToQueue({
      id: task.id,
      task_type: task.task_type,
      config: task.config,
      workflow_id: task.workflow_id,
      priority: task.priority,
      scheduled_for: task.scheduled_for,
    });
    
    res.json({ message: 'Task re-queued for retry', taskId: id });
  } catch (error) {
    console.error('Error retrying task:', error);
    res.status(500).json({ error: 'Failed to retry task' });
  }
});

module.exports = router;

