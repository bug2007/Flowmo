const { spawn } = require('child_process');
const path = require('path');
const { getQueueStats } = require('./src/queueManager');

// Configuration
const WORKER_SCRIPT = path.join(__dirname, 'src', 'worker.js');
const CHECK_INTERVAL = 500;   // Check queue every 5 seconds

const CONFIG = {
  minWorkers: 1,    // Always keep at least 1 worker
  maxWorkers: 5,    // Never exceed 5 workers
  scaleUpThreshold: 3,    // Scale up if queue > 3 waiting tasks
  scaleDownThreshold: 2,  // Scale down if queue < 2 waiting tasks
};

const workers = new Map(); // workerId -> process
let workerCounter = 0;

console.log(' AUTO-SCALER STARTED');
console.log(`   Min workers:          ${CONFIG.minWorkers}`);
console.log(`   Max workers:          ${CONFIG.maxWorkers}`);
console.log(`   Scale UP threshold:   ${CONFIG.scaleUpThreshold} waiting tasks`);
console.log(`   Scale DOWN threshold: ${CONFIG.scaleDownThreshold} waiting tasks`);

// Start a single worker
function startWorker() {
  const workerId = ++workerCounter;
  
  const worker = spawn('node', [WORKER_SCRIPT], {
    env: { ...process.env, WORKER_NUM: workerId },
    stdio: 'inherit'
  });

  worker.on('exit', (code, signal) => {
    workers.delete(workerId);
    
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      // Unexpected crash - restart
      console.log(`  Worker ${workerId} crashed! Restarting...`);
      setTimeout(() => startWorker(), 2000);
    }
  });

  workers.set(workerId, worker);
  console.log(` Scaled UP:   Started worker-${workerId} (total: ${workers.size})`);
  return workerId;
}

// Stop a single worker
function stopWorker() {
  // Get last worker ID
  const lastWorkerId = Math.max(...workers.keys());
  const worker = workers.get(lastWorkerId);
  
  if (worker) {
    worker.kill('SIGTERM');
    workers.delete(lastWorkerId);
    console.log(` Scaled DOWN: Stopped worker-${lastWorkerId} (total: ${workers.size})`);
  }
}

// Scale up by adding workers
function scaleUp(targetCount) {
  const toAdd = targetCount - workers.size;
  console.log(` Scaling UP by ${toAdd} worker(s)...`);
  for (let i = 0; i < toAdd; i++) {
    startWorker();
  }
}

// Scale down by removing workers
function scaleDown(targetCount) {
  const toRemove = workers.size - targetCount;
  console.log(` Scaling DOWN by ${toRemove} worker(s)...`);
  for (let i = 0; i < toRemove; i++) {
    stopWorker();
  }
}

// Main scaling logic
async function checkAndScale() {
  try {
    const stats = await getQueueStats();
    const waiting = stats.waiting;
    const active = stats.active;
    const currentWorkers = workers.size;

    console.log(`\n Queue Stats: waiting=${waiting} | active=${active} | workers=${currentWorkers}`);

    // Decide target worker count
    let targetWorkers = currentWorkers; // by default, keep current no. of workers

    if (waiting > CONFIG.scaleUpThreshold && currentWorkers < CONFIG.maxWorkers) { // check if more than 3 tasks are waiting and if we are allowed to add more workers (not exceeding max)
      // Queue is growing - scale up
      targetWorkers = Math.min(
        CONFIG.maxWorkers,
        currentWorkers + Math.ceil(waiting / CONFIG.scaleUpThreshold)  
      );
      console.log(` Queue growing! (${waiting} waiting) -> Scaling UP to ${targetWorkers} workers`);
    } else if (waiting < CONFIG.scaleDownThreshold && active === 0 && currentWorkers > CONFIG.minWorkers) {
      // Queue is empty - scale down
      targetWorkers = CONFIG.minWorkers;
      console.log(` Queue empty! -> Scaling DOWN to ${targetWorkers} workers`);
    } else {
      console.log(` No scaling needed (${currentWorkers} workers is fine)`);
    }

    // Apply scaling
    if (targetWorkers > currentWorkers) {
      scaleUp(targetWorkers);
    } else if (targetWorkers < currentWorkers) {
      scaleDown(targetWorkers);
    }

  } catch (error) {
    console.error(' Error checking queue:', error.message);
  }
}

// Start with minimum workers
console.log(` Starting with ${CONFIG.minWorkers} worker(s)...\n`);
for (let i = 0; i < CONFIG.minWorkers; i++) {
  startWorker();
}

// Check queue and scale periodically
const scalingInterval = setInterval(checkAndScale, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => shutdown());
process.on('SIGINT', () => shutdown());

function shutdown() {
  console.log('\nAuto-scaler shutting down...');
  clearInterval(scalingInterval);
  
  workers.forEach((worker, id) => {
    console.log(`Stopping worker-${id}...`);
    worker.kill('SIGTERM');
  });
  
  setTimeout(() => process.exit(0), 3000);
}

// Keep process alive
process.stdin.resume();