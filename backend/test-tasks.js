const API_URL = 'http://localhost:4000/api';

// Replace with your actual token after logging in
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImlhdCI6MTc2OTA2ODcxMiwiZXhwIjoxNzY5NjczNTEyfQ.6FRqQvipqspHmct-9v42GOGyZ8sCfMzVhzhE8pjDK-w'; // Get this from localStorage after login

async function testTasks() {
  console.log('Testing Tasks API...\n');

  try {
    // Test 1: Create HTTP task
    console.log('Creating HTTP task...');
    const httpTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        task_type: 'http',
        task_name: 'Fetch Weather Data',
        config: {
          method: 'GET',
          url: 'https://api.weather.gov/gridpoints/TOP/31,80/forecast',
          headers: {}
        }
      })
    });
    const httpTask = await httpTaskResponse.json();
    console.log('HTTP Task created:', httpTask.task.id, '\n');

    // Test 2: Create Email task
    console.log('Creating Email task...');
    const emailTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        task_type: 'email',
        task_name: 'Send Welcome Email',
        config: {
          to: 'user@example.com',
          subject: 'Welcome to Flowmo!',
          body: 'Thanks for signing up.'
        }
      })
    });
    const emailTask = await emailTaskResponse.json();
    console.log('Email Task created:', emailTask.task.id, '\n');

    // Test 3: Get all tasks
    console.log('Fetching all tasks...');
    const tasksResponse = await fetch(`${API_URL}/tasks`, {  // send a get req to backend by default
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const tasks = await tasksResponse.json();
    console.log(`Found ${tasks.tasks.length} tasks\n`);

    // Test 4: Get single task
    console.log('Fetching single task...');
    const taskResponse = await fetch(`${API_URL}/tasks/${httpTask.task.id}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const task = await taskResponse.json();
    console.log('Task details:', task.task.task_name, '\n');

    // Test 5: Delete task
    console.log('Deleting task...');
    const deleteResponse = await fetch(`${API_URL}/tasks/${emailTask.task.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const deleteResult = await deleteResponse.json();
    console.log('Task deleted:', deleteResult.message, '\n');

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testTasks();

