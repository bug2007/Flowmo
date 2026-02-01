const Queue = require('bull'); // Bull is a job queue system for Node.js. It uses Redis in the background to store and manage jobs.

// Create a queue for task execution. queue name is task-execution.
const taskQueue = new Queue('task-execution', {  
  redis: {               // tells Bull where reddis is running
    host: '127.0.0.1',
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed tasks upto 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Wait 2s, then 4s, then 8s between retries
    },
    removeOnComplete: false, // completed jobs stay in redis. useful for history
    removeOnFail: false, // failed jobs are stored in redis for debugging
  },
});

// Add event listeners for monitoring. listen to whats happening inside the queue.
taskQueue.on('completed', (job, result) => {         // Runs when a job finishes successfully
  console.log(`Task ${job.id} completed:`, result);  // job id and returned result from the worker.
});

taskQueue.on('failed', (job, err) => {   // Runs when a job fails after an attempt
  console.log(`Task ${job.id} failed:`, err.message);
});

taskQueue.on('active', (job) => {   // Runs when a worker starts working on a job
  console.log(`Task ${job.id} started processing`);
});

// Function to add a task to the queue
async function addTaskToQueue(taskData) {
  try {
    const job = await taskQueue.add(taskData, {   // Adds a job to taskQueue. job contains bull-generated job ID, job.data (taskData), job.opts (priority, delay, attempts etc.), job.queue (reference to the queue), job.timestamp (when it was added)
      priority: taskData.priority || 10, // Lower number = higher priority
      delay: taskData.scheduledFor ? new Date(taskData.scheduledFor) - new Date() : 0,
    });
    
    console.log(`Task ${taskData.id} added to queue with job ID: ${job.id}`);
    return job;
  } catch (error) {
    console.error('Error adding task to queue:', error);
    throw error;
  }
}

// Function to get queue stats. Returns current queue state
async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    taskQueue.getWaitingCount(),  // Jobs waiting to be processed
    taskQueue.getActiveCount(),   // Jobs currently being processed
    taskQueue.getCompletedCount(),  // Successfully finished jobs
    taskQueue.getFailedCount(),   //Failed jobs
    taskQueue.getDelayedCount(),  // Scheduled jobs waiting for delay
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,  // sum of all jobs
  };
}

module.exports = {
  taskQueue,
  addTaskToQueue,
  getQueueStats,
};


