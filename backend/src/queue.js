require('dotenv').config();
const Queue = require('bull');

console.log("REDIS_URL:", process.env.REDIS_URL ? "FOUND" : "MISSING");


const myQueue = new Queue('my-queue', process.env.REDIS_URL);

myQueue.on('ready', () => {
  console.log('Queue connected to Redis');
});

myQueue.on('error', (err) => {
  console.error('Queue error:', err.message);
});

module.exports = myQueue;