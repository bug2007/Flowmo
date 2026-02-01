// Test workflow endpoints

const getToken = async () => {
  const response = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  const data = await response.json();
  return data.token;
};

const testCreateWorkflow = async (token) => {
  console.log('\n=== Test 1: Create a workflow ===');
  const response = await fetch('http://localhost:4000/api/workflows', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'My First Workflow'
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
  return data.workflow;
};

const testGetAllWorkflows = async (token) => {
  console.log('\n=== Test 2: Get all workflows ===');
  const response = await fetch('http://localhost:4000/api/workflows', {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

const testGetWorkflowById = async (token, workflowId) => {
  console.log('\n=== Test 3: Get workflow by ID ===');
  const response = await fetch(`http://localhost:4000/api/workflows/${workflowId}`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

const testCreateWorkflowWithoutToken = async () => {
  console.log('\n=== Test 4: Try to create workflow WITHOUT token ===');
  const response = await fetch('http://localhost:4000/api/workflows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Should Fail'
    })
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

const testDeleteWorkflow = async (token, workflowId) => {
  console.log('\n=== Test 5: Delete workflow ===');
  const response = await fetch(`http://localhost:4000/api/workflows/${workflowId}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

// Run all tests
(async () => {
  const token = await getToken();
  console.log('Got authentication token');
  
  await testCreateWorkflowWithoutToken();
  const workflow = await testCreateWorkflow(token);
  await testGetAllWorkflows(token);
  await testGetWorkflowById(token, workflow.id);
  await testDeleteWorkflow(token, workflow.id);
})();