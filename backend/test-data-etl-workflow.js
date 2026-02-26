// test data ETL workflow: step 1 is an HTTP task that fetches user data from a public API. step 2 is a data task that transforms that data (selecting specific fields and counting users). step 3 is a file task that saves the transformed data as a CSV. step 4 is an email task that sends an email with the count of users and the file path of the saved CSV. this tests whether data can flow correctly through multiple task types in a workflow.

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testDataETL() {
  try {
    console.log('Test 2: Data ETL Workflow (HTTP -> Data -> File -> Email)\n');
    
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    
    // Create workflow
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Data ETL Pipeline' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // Task 1 - Fetch users from API
    console.log('Creating Task 1: Fetch Users from API...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 1: Fetch Users',
        task_type: 'http',
        step_order: 1,
        config: {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 1 created\n');
    
    // Task 2 - Transform data
    console.log('Creating Task 2: Transform User Data...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Filter & Transform',
        task_type: 'data',
        step_order: 2,
        config: {
          operation: 'transform',
          data: '{{step1.data}}',
          transformations: {
            selectFields: ['name', 'email', 'phone', 'company']
          },
          aggregations: {
            count: true
          }
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 2 created\n');
    
    // Task 3 - Save as CSV
    console.log('Creating Task 3: Save as CSV...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 3: Save as CSV',
        task_type: 'file',
        step_order: 3,
        config: {
          operation: 'save_csv',
          data: '{{step2.data}}',
          outputPath: './exports/users.csv' // in production, the csv file will be saved to supabase storage. for now, it's saved to local filesystem (backend/export/users.csv)
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 3 created\n');
    
    // Task 4 - Send email with file path
    console.log('Creating Task 4: Send Summary Email...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 4: Email Team',
        task_type: 'email',
        step_order: 4,
        config: {
          to: 'team@company.com',
          subject: 'User Data ETL Complete',
          body: 'ETL complete! Processed {{step2.aggregations.count}} users. CSV saved to: {{step3.csvPath}}'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 4 created\n');
    
    // Execute
    console.log('Executing workflow...');
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testDataETL();

