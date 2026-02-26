const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',  
      password: 'password125'
    });
    authToken = response.data.token;
    console.log(' Logged in\n');
  } catch (error) {
    console.error(' Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function floodQueue(numTasks) {
  console.log(`\n Flooding queue with ${numTasks} tasks...\n`);

  const promises = [];

  for (let i = 0; i < numTasks; i++) {
    const promise = axios.post(
      `${API_URL}/tasks`,
      {
        task_type: 'http',
        task_name: `Flood Task ${i + 1}`,
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        },
        priority: 10
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    ).then(async (response) => {
      const taskId = response.data.task.id;
      // Execute task immediately
      await axios.post(
        `${API_URL}/tasks/${taskId}/execute`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      return taskId;
    });

    promises.push(promise);
  }

  // Add ALL tasks simultaneously
  const taskIds = await Promise.all(promises);
  console.log(` ${numTasks} tasks added to queue simultaneously!\n`);
  return taskIds;
}

async function main() {
  console.log(' AUTO-SCALER TEST');

  console.log('This test will:');
  console.log('1. Flood the queue with 50 tasks at once');
  console.log('2. Auto-scaler should detect queue growing');
  console.log('3. Auto-scaler should spawn more workers');
  console.log('4. After tasks finish, auto-scaler should scale down\n');

  console.log('   Make sure ONLY auto-scaler is running (not workerManager)');
  console.log('   Terminal 1: npm run devStart');
  console.log('   Terminal 2: npm run autoscale\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  await login();

  // Flood with 50 tasks
  await floodQueue(50);

  process.exit(0);
}

main().catch(console.error);