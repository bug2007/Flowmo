// tests data passing between sequential tasks in a workflow

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testDataPassing() {
  try {
    console.log('Testing Data Passing Between Workflow Steps\n');
    
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    console.log('Logged in\n');
    
    // 2. Create workflow
    console.log('2. Creating workflow...');
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Data Passing Test Workflow' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // 3. Task 1 - Fetch GitHub user (returns user data)
    console.log('3. Creating Task 1 (HTTP - Fetch user data)...');
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
    console.log(`Task 1 created\n`);
    
    // 4. Task 2 - Email using data from Task 1
    console.log('4. Creating Task 2 (Email - Use data from step 1)...');
    const task2Res = await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Send Email with User Data',
        task_type: 'email',
        step_order: 2,
        config: {
          to: 'recipient@example.com',
          subject: 'GitHub User Info: {{step1.data.login}}',
          body: 'User: {{step1.data.login}}, Name: {{step1.data.name}}, Followers: {{step1.data.followers}}'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`Task 2 created with template variables\n`);
    
    
    // 5. Execute workflow
    console.log('5. Executing workflow...');
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workflow execution started!\n');
    
    console.log('Test complete!');
    
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testDataPassing();