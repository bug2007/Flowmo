const express = require('express');
const router = express.Router();
const pool = require('../db');
const { taskQueue } = require('../queueManager');

/**
 * GET /api/workers/stats. could have created just functions like "function getWorkerStats() { ... }" to monitor the workers but with apis, these r accessible externally: frontend/monitoring dashboard can call it, or can build admin panel.
 * Get statistics about all workers
 */
router.get('/stats', async (req, res) => {
  try {
    // Get queue stats from Bull
    const [waiting, active, completed, failed] = await Promise.all([ // runs all 4 at the same for better performance instead of awaiting each one sequentially.
      taskQueue.getWaitingCount(), // no. of jobs waiting to be picked up by worker.
      taskQueue.getActiveCount(),
      taskQueue.getCompletedCount(),
      taskQueue.getFailedCount(),
    ]);

    // Get worker-specific stats from database. count these for each worker.
    const workerStatsQuery = await pool.query(` 
      SELECT       
        worker_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'success') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        COUNT(*) FILTER (WHERE status = 'running') as active_tasks,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
        MAX(completed_at) as last_task_completed
      FROM tasks
      WHERE worker_id IS NOT NULL
      GROUP BY worker_id
      ORDER BY total_tasks DESC
    `);

    // Get currently active workers
    const activeWorkersQuery = await pool.query(`
      SELECT DISTINCT worker_id, MAX(started_at) as last_seen
      FROM tasks
      WHERE status = 'running'
      GROUP BY worker_id
    `);

    // Get total task distribution. e.g success 50, failed 10, running 5, etc.
    const taskDistribution = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      GROUP BY status
    `);

    res.json({
      queue: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed
      },
      workers: {
        active: activeWorkersQuery.rows,
        stats: workerStatsQuery.rows
      },
      taskDistribution: taskDistribution.rows
    });

  } catch (error) {
    console.error('Error getting worker stats:', error);
    res.status(500).json({ error: 'Failed to fetch worker stats' });
  }
});

/**
 * GET /api/workers/:workerId/tasks
 * Get all tasks processed by a specific worker
 */
router.get('/:workerId/tasks', async (req, res) => {
  try {
    const { workerId } = req.params;
    const { limit = 50, status } = req.query;  // e.g /api/workers/2/tasks?status=failed&limit=10. default limit is 50.

    let query = 'SELECT * FROM tasks WHERE worker_id = $1';
    const params = [workerId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY started_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      workerId,
      tasks: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting worker tasks:', error);
    res.status(500).json({ error: 'Failed to fetch worker tasks' });
  }
});

/**
 * GET /api/workers/active
 * Get list of active workers in last 5 mins
 */
router.get('/active', async (req, res) => {
  try {
    // Workers that have processed tasks in the last 5 minutes
    const result = await pool.query(`
      SELECT 
        worker_id,
        MAX(started_at) as last_seen,
        COUNT(*) FILTER (WHERE status = 'running') as current_tasks
      FROM tasks
      WHERE started_at > NOW() - INTERVAL '5 minutes'
      GROUP BY worker_id
      ORDER BY last_seen DESC
    `);

    res.json({
      workers: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting active workers:', error);
    res.status(500).json({ error: 'Failed to fetch active workers' });
  }
});

module.exports = router;

