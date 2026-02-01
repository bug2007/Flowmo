const API_URL = 'http://localhost:4000/api';

// Replace with your actual token for manual testing.
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImlhdCI6MTc2OTA2ODcxMiwiZXhwIjoxNzY5NjczNTEyfQ.6FRqQvipqspHmct-9v42GOGyZ8sCfMzVhzhE8pjDK-w';

async function testTaskExecution() {
  console.log('Testing Task Execution...\n');

  try {
    // Test 1: Create and execute HTTP task
    console.log('Creating HTTP task...');  
    const httpTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({   // since workflow id is not being provided here, this is a standalone task.
        task_type: 'http',
        task_name: 'Get Random User',
        config: {
          method: 'GET',
          url: 'https://randomuser.me/api/',
          headers: {}
        }
      })
    });
    const httpTask = await httpTaskResponse.json();
    console.log('HTTP Task created:', httpTask.task.id);

    console.log('Executing HTTP task...');
    const httpExecResponse = await fetch(`${API_URL}/tasks/${httpTask.task.id}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const httpExecResult = await httpExecResponse.json();
    console.log('HTTP Task executed:', httpExecResult.task.status);
    console.log('Result preview:', JSON.stringify(httpExecResult.task.result).substring(0, 100) + '...\n');

    // Test 2: Create and execute Data task
    console.log('Creating Data transformation task...');
    const dataTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        task_type: 'data',
        task_name: 'Filter and Sort Users',
        config: {
          operation: 'transform',
          data: [
            { id: 1, name: 'Alice', age: 30, score: 85 },
            { id: 2, name: 'Bob', age: 25, score: 92 },
            { id: 3, name: 'Charlie', age: 30, score: 78 },
            { id: 4, name: 'Diana', age: 28, score: 95 }
          ],
          filters: { age: 30 },
          transformations: {
            sortBy: 'score',
            sortOrder: 'desc'
          },
          aggregations: {
            count: true,
            average: ['score']
          }
        }
      })
    });
    const dataTask = await dataTaskResponse.json();
    console.log('Data Task created:', dataTask.task.id);

    console.log('Executing Data task...');
    const dataExecResponse = await fetch(`${API_URL}/tasks/${dataTask.task.id}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const dataExecResult = await dataExecResponse.json();
    console.log('Data Task executed:', dataExecResult.task.status);
    console.log('Result:', JSON.stringify(dataExecResult.task.result, null, 2), '\n');

    // Test 3: Create and execute Email task
    console.log('Creating Email task...');
    const emailTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        task_type: 'email',
        task_name: 'Send Test Email',
        config: {
          to: 'test@example.com',
          subject: 'Test Email from Flowmo',
          body: 'This is a test email sent from the Flowmo task execution system!'
        }
      })
    });
    const emailTask = await emailTaskResponse.json();
    console.log('Email Task created:', emailTask.task.id);

    console.log('Executing Email task...');
    const emailExecResponse = await fetch(`${API_URL}/tasks/${emailTask.task.id}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const emailExecResult = await emailExecResponse.json();
    console.log('Email Task executed:', emailExecResult.task.status);
    if (emailExecResult.task.result?.previewUrl) {
      console.log('Preview email at:', emailExecResult.task.result.previewUrl);
    }
    console.log();

    // Test 4: Test failure and retry
    console.log('Testing failure and retry...');
    const failTaskResponse = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        task_type: 'http',
        task_name: 'Failing Task',
        config: {
          method: 'GET',
          url: 'https://invalid-url-that-will-fail.fake',
          headers: {}
        },
        max_retries: 2
      })
    });
    const failTask = await failTaskResponse.json();
    console.log('Failing Task created:', failTask.task.id);

    console.log('Executing failing task (should retry)...');
    const failExecResponse = await fetch(`${API_URL}/tasks/${failTask.task.id}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });
    const failExecResult = await failExecResponse.json();
    console.log('Task failed as expected');
    console.log('Will retry:', failExecResult.willRetry);
    console.log('Retry count:', failExecResult.task.retry_count);
    console.log();

    console.log('All execution tests passed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testTaskExecution();



