// test data report generator workflow: step 1 is a data task that processes sales data and produces aggregated results. step 2 is an email task that uses those aggregated results in its email body. this tests whether data produced by one task can be correctly passed and used in a subsequent task.

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

async function testDataToEmail() {
  try {
    console.log('Test 1: Data Report Generator (Data → Email)\n');
    
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    
    // Create workflow
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'Data Report Generator' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // Task 1 - Process sales data
    console.log('Creating Task 1: Process Sales Data...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 1: Process Sales Data',
        task_type: 'data',
        step_order: 1,
        config: {
          operation: 'transform',
          data: [
            { product: 'Laptop', sales: 15000, region: 'North' },
            { product: 'Phone', sales: 8000, region: 'South' },
            { product: 'Tablet', sales: 5000, region: 'North' },
            { product: 'Monitor', sales: 3000, region: 'East' }
          ],
          filters: { region: 'North' },
          aggregations: {
            count: true,
            sum: ['sales']
          }
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 1 created\n');
    
    // Task 2 - Send report email
    console.log('Creating Task 2: Send Report Email...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Email Sales Report',
        task_type: 'email',
        step_order: 2,
        config: {
          to: 'manager@company.com',
          subject: 'Sales Report - North Region',
          body: 'Total sales: ${{step1.aggregations.sum_sales}}, Products sold: {{step1.aggregations.count}}'
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
    console.log('Expected: Email body should say "Total sales: $20000, Products sold: 2"\n');
    console.log('Check worker terminal and email preview URL!\n');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testDataToEmail();