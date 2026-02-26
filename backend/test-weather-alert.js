// tests a simple workflow that fetches weather data for Dhaka from a public API and sends an email alert with the current temperature. this tests whether the HTTP task can fetch data and pass it to the email task correctly.
const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testWeatherAlert() {
  try {
    console.log('Test 3: Weather Alert (HTTP -> Email)\n');
    
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    
    // Create workflow
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Weather Alert Pipeline' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // Task 1 - Fetch weather data
    console.log('Creating Task 1: Fetch Weather Data...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 1: Get Weather Forecast',
        task_type: 'http',
        step_order: 1,
        config: {
          method: 'GET',
          url: 'https://api.open-meteo.com/v1/forecast?latitude=23.8103&longitude=90.4125&current=temperature_2m,weathercode'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 1 created\n');
    
    // Task 2 - Send weather alert email
    console.log('Creating Task 2: Send Weather Alert...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Email Weather Alert',
        task_type: 'email',
        step_order: 2,
        config: {
          to: 'user@example.com',
          subject: 'Weather Update for Dhaka',
          body: 'Current temperature: {{step1.data.current.temperature_2m}}°C'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 2 created\n');
    
    // Execute
    console.log('Executing workflow...');
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workflow started!\n');
    console.log('Expected: Email should contain current temperature in Dhaka\n');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testWeatherAlert();


