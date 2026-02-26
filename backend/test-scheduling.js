const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',  // Change to your test user
      password: 'password123'
    });
    authToken = response.data.token;
    console.log('Logged in\n');
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testScheduledTask() {
  console.log('TESTING TASK SCHEDULING\n');
  
  try {
    // Schedule task to run 10 seconds from now
    // Create proper UTC time 10 seconds in future
    const scheduledTime = new Date(Date.now() + 10000);
    console.log('Debug scheduledTime:', scheduledTime.toISOString());
    console.log('Debug current time:', new Date().toISOString());
    
    console.log(`Scheduling task to run at: ${scheduledTime.toLocaleTimeString()}\n`);
    
    // Create a scheduled task
    const taskResponse = await axios.post(
      `${API_URL}/tasks`,
      {
        task_type: 'email',
        task_name: 'Scheduled Email Test',
        config: {
          to: 'scheduled@test.com',
          subject: 'This email was scheduled!',
          body: `This task was scheduled to run at ${scheduledTime.toLocaleTimeString()}`
        },
        scheduled_for: scheduledTime.toISOString(),
        priority: 5
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const taskId = taskResponse.data.task.id;
    console.log(`Task created: ${taskId}`);
    console.log(`Task scheduled for: ${scheduledTime.toLocaleTimeString()}`);
    console.log(`Current time: ${new Date().toLocaleTimeString()}`);
    console.log(`\nWaiting 10 seconds for task to execute...\n`);
    
    // Execute the task (it will be delayed by Bull)
    await axios.post(
      `${API_URL}/tasks/${taskId}/execute`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('Task queued with delay\n');
    
    // Monitor task status every 2 seconds
    let checks = 0;
    const maxChecks = 10;
    
    const interval = setInterval(async () => {
      checks++;
      
      try {
        const taskStatus = await axios.get(`${API_URL}/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const task = taskStatus.data.task;
        const now = new Date().toLocaleTimeString();
        
        console.log(`[${now}] Status: ${task.status}`);
        
        if (task.status === 'success') {
          clearInterval(interval);
          console.log(`\nSUCCESS! Task executed at the scheduled time!`);
          console.log(`Check email preview URL in database\n`);
          process.exit(0);
        } else if (task.status === 'failed') {
          clearInterval(interval);
          console.log(`\nTask failed: ${task.error_message}\n`);
          process.exit(1);
        }
        
        if (checks >= maxChecks) {
          clearInterval(interval);
          console.log(`\nTask still pending after ${maxChecks * 2} seconds\n`);
          process.exit(0);
        }
      } catch (error) {
        console.error('Error checking status:', error.message);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('TASK SCHEDULING TEST');
  
  console.log('This test will:');
  console.log('1. Create a task scheduled to run in 10 seconds');
  console.log('2. Monitor its status every 2 seconds');
  console.log('3. Verify it executes at the scheduled time\n');
  
  await login();
  await testScheduledTask();
}

main().catch(console.error);