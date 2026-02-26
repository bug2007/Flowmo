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
    console.log('Logged in\n');
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testNotifications() {
  console.log('TESTING WORKFLOW NOTIFICATIONS\n');

  try {
    // Create a simple workflow
    const workflowResponse = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Notification Test Workflow' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    const workflowId = workflowResponse.data.workflow.id;
    console.log(`Workflow created: ${workflowId}`);

    // Add a simple task
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_type: 'http',
        task_name: 'Simple HTTP Task',
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        },
        step_order: 1
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Task added\n');

    // Execute workflow
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    console.log('Workflow executing...\n');
    console.log('Notification sent for workflow...');
    console.log('Preview URL: https://ethereal.email/...\n');

    // Monitor workflow status
    let checks = 0;
    const interval = setInterval(async () => {
      checks++;

      const response = await axios.get(
        `${API_URL}/workflows/${workflowId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const status = response.data.workflow.status;
      console.log(`[Check ${checks}] Workflow status: ${status}`);

      if (status === 'completed' || status === 'failed') {
        clearInterval(interval);
        console.log(`\nWorkflow ${status}! Check backend terminal for notification preview URL!`);
        process.exit(0);
      }

      if (checks >= 15) {
        clearInterval(interval);
        console.log('\nTimeout - check backend logs');
        process.exit(0);
      }
    }, 2000);

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('WORKFLOW NOTIFICATION TEST');

  await login();
  await testNotifications();
}

main().catch(console.error);