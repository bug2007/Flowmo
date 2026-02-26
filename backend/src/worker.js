// u just run worker.js in the terminal (in the initial phase of the proj). Bull then listens to Redis and pulls jobs automatically when they appear.
require('dotenv').config();
const { taskQueue } = require('./queueManager');  // the queue where tasks r waiting
const taskExecutor = require('./taskExecutor');  // The worker itself doesn't know how to do tasks. it just gets a job and calls executeTask().
const pool = require('./db');  
const workflowExecutor = require('./workflowExecutor');

const nodemailer = require('nodemailer');

async function sendTaskNotification(taskId, status) { // to send notif after the completion of standalone tasks.
  try {
    // Get task + user email
    const result = await pool.query(
      `SELECT t.task_name, t.id, u.email, u.name as user_name
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.id = $1`,
      [taskId]
    );

    if (result.rows.length === 0) return;

    const { task_name, email, user_name } = result.rows[0];

    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });

    const isSuccess = status === 'success';
    const subject = isSuccess
      ? `Task "${task_name}" completed!`
      : `Task "${task_name}" failed`;

    const body = isSuccess
      ? `Hi ${user_name},\n\nYour task "${task_name}" has completed successfully!\n\nTask ID: ${taskId}\nStatus: Completed`
      : `Hi ${user_name},\n\nYour task "${task_name}" has failed.\n\nTask ID: ${taskId}\nStatus: Failed`;

    const info = await transporter.sendMail({
      from: '"Flowmo" <flowmo@example.com>',
      to: email,
      subject,
      text: body
    });

    console.log(`   Notification sent for task ${taskId} (${status})`);
    console.log(`   Preview: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    console.error('  Failed to send notification:', error.message);
  }
}

// Generate unique worker ID using process ID
const WORKER_ID = `worker-${process.pid}`;   // inside worker.js, process.pid will be only THAT worker's process ID. if u run multiple instances of worker.js, each will have a different process ID and thus a different WORKER_ID.
const CONCURRENCY = 5;

console.log(`[${WORKER_ID}] Worker started`);
console.log(`[${WORKER_ID}] Concurrency: ${CONCURRENCY} tasks`);
console.log(`[${WORKER_ID}] Waiting for tasks from queue...`);

// Worker process - executes tasks from the queue
taskQueue.process(CONCURRENCY, async (job) => {   // process() tells Bull this process is a worker
  // Process up to 5 tasks concurrently
  const { id, task_type, config, workflow_id } = job.data;  // bull can make sure no other worker takes the same job
  const startTime = Date.now();

  console.log(`[${WORKER_ID}] Picked up task ${id} (type: ${task_type})`);

  try {
    // Update task status to 'running' and record worker ID
    await pool.query(
      'UPDATE tasks SET status = $1, worker_id = $2, started_at = NOW() WHERE id = $3',
      ['running', WORKER_ID, id]
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

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[${WORKER_ID}] Task ${id} completed in ${duration}s`);

      // ONLY trigger workflow next step if this is part of a workflow
      // This will be called once on success
      if (!workflow_id) {
        await sendTaskNotification(id, 'success');
      }
      if (workflow_id) {
        await workflowExecutor.onTaskComplete(id, result);
      }
      
      return {   // returned to Bull.
        success: true,  // triggers taskQueue.on('completed', ...)
        id,
        result,
      };
    } else {
      throw new Error(result.error || 'Task execution failed');  // immediately, execution jumps to catch block. bull not involved yet.
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[${WORKER_ID}] Task ${id} failed after ${duration}s:`, error.message);

    // Update task status to 'failed'
    await pool.query(
      `UPDATE tasks 
       SET status = $1, 
           error_message = $2,
           retry_count = retry_count + 1
       WHERE id = $3`,
      ['failed', error.message, id]
    );

    // ONLY mark workflow as failed if this was the FINAL attempt
    // Check if this is the last retry attempt
    const isFinalAttempt = job.attemptsMade + 1 >= job.opts.attempts;
    
    if (isFinalAttempt && workflow_id) {
      console.log(`[${WORKER_ID}] Task ${id} failed permanently after ${job.opts.attempts} attempts`);
      await workflowExecutor.onTaskFail(id, error.message);
    }

    if (isFinalAttempt && !workflow_id) {
      await sendTaskNotification(id, 'failed');
    }
    
    // Throw error (the func exits with this unhandled error) so Bull knows the job failed (will trigger retry if attempts left)
    throw error;   // triggers taskQueue.on('failed', ...) since func exits with unhandled error.
  }
});



// shutdown. listens for termination signal. happens for example when server shuts down or docker stops
process.on('SIGTERM', async () => {
  console.log(`\n[${WORKER_ID}] Received SIGTERM, shutting down...`);
  await taskQueue.close();  // stops pulling new jobs and lets current jobs finish
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`\n[${WORKER_ID}] Received SIGINT, shutting down...`);
  await taskQueue.close();
  await pool.end();
  process.exit(0);
});

//if ctrl+c is pressed, it sends SIGINT signal. we want to close the queue and database connection gracefully before exiting. otherwise, if a task is being processed when ctrl+c is pressed, it might leave the task in an inconsistent state (marked as running but worker is gone). by closing the queue, we stop pulling new jobs and let current jobs finish before exiting.
process.on('SIGINT', async () => {
  console.log(`\n[${WORKER_ID}] Received SIGINT, shutting down...`);
  await taskQueue.close();
  process.exit(0);
});

console.log(`[${WORKER_ID}] Ready to process tasks!\n`);