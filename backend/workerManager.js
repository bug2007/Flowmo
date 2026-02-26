const { spawn } = require('child_process');  // spawn() = start another process. Here, we use it to run node worker.js multiple times.
const path = require('path'); // to build file paths

// Configuration
const NUM_WORKERS = process.argv[2] || process.env.NUM_WORKERS || 3;  // if we run NUM_WORKERS=5 node workerManager.js, will start 5 workers, otherwise 3.
const WORKER_SCRIPT = path.join(__dirname, 'src', 'worker.js');  // backend/src/worker.js

const workers = [];  // stores: { id: workerId, process: childProcess } e.g { id: 2, process: ChildProcess { pid: 8347} }. This pid is the same as process.pid in worker.js.

console.log(`WORKER MANAGER - Starting ${NUM_WORKERS} workers`);

// Start a single worker
function startWorker(workerId) {
  const worker = spawn('node', [WORKER_SCRIPT], { // literally runs node src/worker.js
    env: { ...process.env, WORKER_NUM: workerId },  // passed to worker.js as process.env.WORKER_NUM, so each worker can know its own ID (1, 2, 3, etc) for logging and debugging.
    stdio: 'inherit' // Show worker output in console
  });

  worker.on('exit', (code, signal) => { // runs when the worker process stops for any reason (crash, killed, normal exit)
    if (signal) {
      console.log(`Worker ${workerId} killed by signal ${signal}`);
    } else if (code !== 0) { // code 0 = normal exit. non-zero means error/crash
      console.log(`Worker ${workerId} exited with code ${code}`);
      
      // Auto-restart worker on crash
      console.log(`Restarting worker ${workerId}...`);
      setTimeout(() => {
        const index = workers.findIndex(w => w.id === workerId); // finding the worker in workers array by worker id. 
        if (index !== -1) {
          workers[index] = startWorker(workerId); // replace dead worker with new one in workers array
        }
      }, 2000); // wait 2 secs, then restart worker
    } else {
      console.log(`Worker ${workerId} exited gracefully`);
    }
  });

  return { id: workerId, process: worker };  // stored in workers array 
}

// Spawn all workers
for (let i = 1; i <= NUM_WORKERS; i++) {
  console.log(`Starting worker ${i}/${NUM_WORKERS}...`);
  workers.push(startWorker(i));
}

console.log(`\nAll ${NUM_WORKERS} workers started successfully!\n`);
console.log(`   - Press Ctrl+C to stop all workers`);
console.log(`   - Workers will auto-restart on crash`);
console.log(`   - Each worker can process 5 concurrent tasks`);
console.log(`   - Total capacity: ${NUM_WORKERS * 5} concurrent tasks\n`);

// Graceful shutdown
process.on('SIGTERM', () => { // when docker or server shuts down, it sends SIGTERM signal to this manager process. we listen for it to shut down all worker processes gracefully (close queue, db connection) before exiting.
  console.log(`\nShutting down all workers...`);
  workers.forEach(({ id, process: worker }) => {
    console.log(`   Stopping worker ${id}...`);
    worker.kill('SIGTERM'); // sends SIGTERM signal to each worker process, which we listen for in worker.js to close queue and db connection gracefully before exiting.
  });
  setTimeout(() => process.exit(0), 3000); // wait 3 secs to allow workers to shut down gracefully before exiting manager process. otherwise, if we exit immediately, it might kill worker processes before they can clean up (close queue, db connection), which can lead to inconsistent state (tasks marked as running but worker is gone).
});

process.on('SIGINT', () => { // when ctrl+c is pressed in terminal, it sends SIGINT signal to this manager process. we listen for it to shut down all worker processes gracefully (close queue, db connection) before exiting.
  console.log(`\nShutting down all workers...`);
  workers.forEach(({ id, process: worker }) => {
    console.log(`   Stopping worker ${id}...`);
    worker.kill('SIGTERM');
  });
  setTimeout(() => process.exit(0), 3000);
});

// Keep process alive
process.stdin.resume();

