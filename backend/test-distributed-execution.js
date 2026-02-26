// PROOF: Multiple workers handle multiple workflows from multiple users

const axios = require('axios');

const API_URL = 'http://localhost:4000/api';

// Simulate 3 different users
const users = [
  { email: 'user1@test.com', password: 'password123', token: '' },
  { email: 'user2@test.com', password: 'password123', token: '' },
  { email: 'user3@test.com', password: 'password123', token: '' }
];

// Login all users
async function loginAllUsers() {
  console.log('Logging in 3 users...\n');
  
  for (const user of users) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: user.email,
        password: user.password
      });
      user.token = response.data.token;
      console.log(`${user.email} logged in`);
    } catch (error) {
      console.error(`${user.email} login failed:`, error.response?.data || error.message);
      
      // Try to create the user if login fails
      try {
        await axios.post(`${API_URL}/auth/signup`, {
          name: user.email.split('@')[0],
          email: user.email,
          password: user.password
        });
        console.log(`Created user ${user.email}, logging in...`);
        
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: user.email,
          password: user.password
        });
        user.token = response.data.token;
      } catch (signupError) {
        console.error(`Could not create ${user.email}`);
        process.exit(1);
      }
    }
  }
  console.log('\nAll users logged in!\n');
}

// Create workflow for a user
async function createWorkflow(user, workflowName, numTasks) {
  try {
    // Create workflow
    const workflowResponse = await axios.post(
      `${API_URL}/workflows`,
      { name: workflowName },
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    
    const workflowId = workflowResponse.data.workflow.id;
    console.log(`Created workflow "${workflowName}" (ID: ${workflowId}) for ${user.email}`);
    
    // Add tasks to workflow
    const taskTypes = ['http', 'data', 'email'];
    
    for (let i = 0; i < numTasks; i++) {
      const taskType = taskTypes[i % taskTypes.length];
      
      let config;
      if (taskType === 'http') {
        config = {
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        };
      } else if (taskType === 'data') {
        config = {
          data: Array.from({length: 50}, (_, j) => ({ id: j, value: Math.random() })),
          filters: {},
          aggregations: { count: true }
        };
      } else {
        config = {
          to: `${user.email}`,
          subject: `Task ${i+1} from workflow ${workflowName}`,
          body: 'Testing distributed execution'
        };
      }
      
      await axios.post(
        `${API_URL}/tasks`,
        {
          workflow_id: workflowId,
          task_type: taskType,
          task_name: `${workflowName} - Task ${i+1}`,
          config: config,
          step_order: i + 1
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
    }
    
    console.log(`Added ${numTasks} tasks to workflow ${workflowId}`);
    return workflowId;
    
  } catch (error) {
    console.error(`Error creating workflow:`, error.response?.data || error.message);
    throw error;
  }
}

// Execute workflow
async function executeWorkflow(user, workflowId, workflowName) {
  try {
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    console.log(`Executed workflow "${workflowName}" (ID: ${workflowId})`);
  } catch (error) {
    console.error(`Error executing workflow:`, error.response?.data || error.message);
    throw error;
  }
}

// Monitor execution
async function monitorDistributedExecution() {
  console.log('\nMONITORING DISTRIBUTED EXECUTION\n');
  console.log('Checking every 2 seconds for 30 seconds...\n');
  
  let checks = 0;
  const maxChecks = 15;
  
  const interval = setInterval(async () => {
    checks++;
    
    try {
      const stats = await axios.get(`${API_URL}/workers/stats`);
      
      console.log(`Check ${checks}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
      
      console.log('\nQueue Stats:');
      console.log(`   Waiting:   ${stats.data.queue.waiting.toString().padEnd(4)} tasks`);
      console.log(`   Active:    ${stats.data.queue.active.toString().padEnd(4)} tasks   Tasks being processed NOW`);
      console.log(`   Completed: ${stats.data.queue.completed.toString().padEnd(4)} tasks`);
      console.log(`   Failed:    ${stats.data.queue.failed.toString().padEnd(4)} tasks`);
      
      console.log('\nActive Workers:');
      if (stats.data.workers.active.length === 0) {
        console.log('   No workers processing at this moment');
      } else {
        stats.data.workers.active.forEach(worker => {
          console.log(`   ${worker.worker_id} - Processing ${worker.current_tasks || 0} tasks`);
        });
      }
      
      console.log('\nWorker Performance:');
      if (stats.data.workers.stats.length === 0) {
        console.log('   No stats yet');
      } else {
        stats.data.workers.stats.forEach(worker => {
          console.log(`   ${worker.worker_id}:`);
          console.log(`      Total: ${worker.total_tasks} | Completed: ${worker.completed_tasks} | Failed: ${worker.failed_tasks}`);
        });
      }
      
      // Show task distribution across workers
      console.log('\n PROOF OF DISTRIBUTED EXECUTION:');
      if (stats.data.workers.stats.length > 1) {
        console.log(`    ${stats.data.workers.stats.length} different workers processed tasks`);
        console.log(`    Work distributed across multiple worker processes`);
        console.log(`    Demonstrating parallel, distributed task execution`);
      } else if (stats.data.workers.stats.length === 1) {
        console.log(`     Only 1 worker has processed tasks so far`);
      }
      
      if (checks >= maxChecks) {
        clearInterval(interval);
        console.log('\n Monitoring complete!\n');
        await showFinalResults();
      }
      
    } catch (error) {
      console.error(' Error fetching stats:', error.message);
    }
  }, 2000);
}

// Show final results from database
async function showFinalResults() {
  console.log(' FINAL RESULTS - DISTRIBUTED EXECUTION PROOF');
  
  console.log('Query your database with:');
  console.log(`
SELECT 
  worker_id,
  COUNT(*) as tasks_processed,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM tasks
WHERE worker_id IS NOT NULL
GROUP BY worker_id
ORDER BY tasks_processed DESC;
  `);
  
  console.log('\n If multiple worker_ids seen, distributed execution is proven!');
  console.log(' If tasks from different users were processed, multiple workflows have been handled!');
  console.log('\n' + '='.repeat(80) + '\n');
  
  process.exit(0);
}

// Main execution
async function main() {
  console.log('DISTRIBUTED TASK EXECUTION TEST');
  
  console.log('This test will:');
  console.log('1. Create 3 different users');
  console.log('2. Each user creates a workflow with different number of tasks');
  console.log('3. Execute ALL workflows simultaneously');
  console.log('4. Monitor how workers distribute the workload\n');
  
  console.log('   Run in another terminal: npm run workers\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 1: Login all users
  await loginAllUsers();
  
  // Step 2: Create workflows for each user (different sizes)
  console.log(' Creating workflows for each user...\n');
  
  const workflows = [];
  
  workflows.push({
    user: users[0],
    workflowId: await createWorkflow(users[0], 'User1 - Small Workflow', 5),
    name: 'User1 - Small Workflow'
  });
  
  workflows.push({
    user: users[1],
    workflowId: await createWorkflow(users[1], 'User2 - Medium Workflow', 10),
    name: 'User2 - Medium Workflow'
  });
  
  workflows.push({
    user: users[2],
    workflowId: await createWorkflow(users[2], 'User3 - Large Workflow', 15),
    name: 'User3 - Large Workflow'
  });
  
  console.log('\n All workflows created!\n');
  console.log(`Total tasks across all users: 30 tasks`);
  console.log(`   User 1:  5 tasks`);
  console.log(`   User 2: 10 tasks`);
  console.log(`   User 3: 15 tasks\n`);
  
  // Step 3: Execute ALL workflows simultaneously
  console.log('Executing all workflows SIMULTANEOUSLY...\n');
  
  await Promise.all([
    executeWorkflow(workflows[0].user, workflows[0].workflowId, workflows[0].name),
    executeWorkflow(workflows[1].user, workflows[1].workflowId, workflows[1].name),
    executeWorkflow(workflows[2].user, workflows[2].workflowId, workflows[2].name)
  ]);
  
  console.log('\n All workflows executing in parallel!\n');
  
  // Step 4: Monitor execution
  await monitorDistributedExecution();
}

main().catch(console.error);

