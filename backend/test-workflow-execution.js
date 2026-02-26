const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testWorkflowExecution() {
  try {
    console.log('Testing Multi-Step Workflow Execution\n');
    
    // Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    console.log('Logged in\n');
    
    // Create a workflow
    console.log('Creating workflow...');
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Test Multi-Step Workflow' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // Create Task 1 - HTTP Request
    console.log('Creating Task 1 (HTTP)...');
    const task1Res = await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 1: Fetch GitHub User',
        task_type: 'http',
        step_order: 1,
        config: {
          method: 'GET',
          url: 'https://api.github.com/users/octocat'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Task 1 created (ID: ${task1Res.data.task.id})\n`);
    
    // Create Task 2 - Data Processing
    console.log('Creating Task 2 (Data)...');
    const task2Res = await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Process Data',
        task_type: 'data',
        step_order: 2,
        config: {
          operation: 'transform',
          data: [
            { name: 'Alice', age: 30, role: 'admin' },
            { name: 'Bob', age: 25, role: 'user' },
            { name: 'Charlie', age: 35, role: 'admin' }
          ],
          filters: { role: 'admin' },
          transformations: {
            selectFields: ['name', 'age']
          }
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Task 2 created (ID: ${task2Res.data.task.id})\n`);
    
    // Create Task 3 - Email
    console.log('Creating Task 3 (Email)...');
    const task3Res = await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 3: Send Email',
        task_type: 'email',
        step_order: 3,
        config: {
          to: 'recipient@example.com',
          subject: 'Workflow',
          body: 'Execute Multi-Step Workflow'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Task 3 created (ID: ${task3Res.data.task.id})\n`);
    
    // Execute workflow
    console.log('Executing workflow...');
    const executeRes = await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workflow execution started!\n');
    console.log('Result:', executeRes.data);
    
    console.log('\nTest complete');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testWorkflowExecution();