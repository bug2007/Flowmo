// u just run backend in the terminal. Bull then listens to Redis and pulls jobs automatically when they appear.

const { taskQueue } = require('./queueManager');
const taskExecutor = require('./taskExecutor');  // The worker itself doesn't know how to do tasks. it just gets a job and calls executeTask().
const pool = require('./db');  

// Worker process - executes tasks from the queue
taskQueue.process(5, async (job) => {   // process() tells Bull this process is a worker
  // Process up to 5 tasks concurrently
  const { id, task_type, config, workflow_id } = job.data;  // bull can make sure no other worker takes the same job

  console.log(`\nWorker processing task ${id} (type: ${task_type})`);

  try {
    // Update task status to 'running'
    await pool.query(
      'UPDATE tasks SET status = $1, started_at = NOW() WHERE id = $2',
      ['running', id]
    );

    // Execute the task using existing taskExecutor
    const result = await taskExecutor.executeTask(task_type, config);

    // Check if task actually succeeded
    if (result.success) {
      // Update task status to 'success'
      await pool.query(
        `UPDATE tasks 
         SET status = $1, 
             completed_at = NOW(), 
             result = $2
         WHERE id = $3`,
        ['success', JSON.stringify(result), id]
      );

      console.log(`✅ Task ${id} completed successfully`);
      
      return {   // returned to Bull.
        success: true,  // triggers taskQueue.on('completed', ...)
        id,
        result,
      };
    } else {
      // Task failed - throw error to trigger Bull's retry
      throw new Error(result.error || 'Task execution failed');
    }
  } catch (error) {
    console.error(`❌ Task ${id} failed:`, error.message);

    // Update task status to 'failed'
    await pool.query(
      `UPDATE tasks 
       SET status = $1, 
           error_message = $2,
           retry_count = retry_count + 1
       WHERE id = $3`,
      ['failed', error.message, id]
    );

    // Throw error so Bull knows the job failed (will trigger retry)
    throw error;   // triggers taskQueue.on('failed', ...)
  }
});



// shutdown. listens for termination signal. happens for example when server shuts down or docker stops
process.on('SIGTERM', async () => {
  console.log('\n⏸️  Shutting down worker gracefully...');
  await taskQueue.close();  // stops pulling new jobs and lets current jobs finish
  process.exit(0);
});