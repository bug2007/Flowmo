const axios = require('axios');

const API_URL = 'http://localhost:4000/api';
let authToken = '';

// Login first
async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',  
      password: 'password125'     
    });
    authToken = response.data.token;
    console.log('Logged in successfully\n');
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Create a workflow with 15 tasks
async function createTestWorkflow() {
  try {
    console.log('Creating workflow with 15 tasks to test multiple workers...\n');

    const response = await axios.post(
      `${API_URL}/workflows`,
      {
        name: 'Multi-Worker Test - 15 Tasks',
        description: 'Testing multiple workers processing tasks in parallel'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    const workflowId = response.data.workflow.id;
    console.log(`Workflow created: ${workflowId}\n`);

    // Add 15 different tasks with CORRECT configs matching taskExecutor.js
    const tasks = [
      // 5 HTTP tasks
      { 
        type: 'http', 
        task_name: 'Fetch GitHub User', 
        config: { 
          method: 'GET',
          url: 'https://api.github.com/users/github'
        } 
      },
      { 
        type: 'http', 
        task_name: 'Fetch Sample Post', 
        config: { 
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/posts/1'
        } 
      },
      { 
        type: 'http', 
        task_name: 'Fetch Node.js Repo', 
        config: { 
          method: 'GET',
          url: 'https://api.github.com/repos/nodejs/node'
        } 
      },
      { 
        type: 'http', 
        task_name: 'Fetch Sample User', 
        config: { 
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users/1'
        } 
      },
      { 
        type: 'http', 
        task_name: 'Fetch Torvalds Profile', 
        config: { 
          method: 'GET',
          url: 'https://api.github.com/users/torvalds'
        } 
      },
      
      // 5 Data tasks - CORRECTED to match taskExecutor.js
      { 
        type: 'data', 
        task_name: 'Filter High Value Items', 
        config: { 
          data: Array.from({length: 100}, (_, i) => ({ id: i, value: Math.random(), category: 'A' })),
          filters: { category: 'A' },
          transformations: {
            sortBy: 'value',
            sortOrder: 'desc',
            limit: 10
          }
        }
      },
      { 
        type: 'data', 
        task_name: 'Calculate Category Totals', 
        config: { 
          data: Array.from({length: 100}, (_, i) => ({ 
            category: `cat${i % 5}`, 
            amount: Math.floor(Math.random() * 1000)
          })),
          aggregations: {
            count: true,
            sum: ['amount'],
            average: ['amount']
          }
        }
      },
      { 
        type: 'data', 
        task_name: 'Transform Product List', 
        config: { 
          data: Array.from({length: 100}, (_, i) => ({ 
            name: `Product ${i}`, 
            price: i * 10,
            stock: Math.floor(Math.random() * 100),
            category: `Category ${i % 5}`
          })),
          transformations: {
            selectFields: ['name', 'price'],
            limit: 20
          }
        }
      },
      { 
        type: 'data', 
        task_name: 'Filter Active Records', 
        config: { 
          data: Array.from({length: 100}, (_, i) => ({ 
            id: i, 
            status: i % 2 === 0 ? 'active' : 'inactive',
            value: Math.random() * 1000
          })),
          filters: { status: 'active' },
          aggregations: {
            count: true,
            average: ['value']
          }
        }
      },
      { 
        type: 'data', 
        task_name: 'Regional Sales Summary', 
        config: { 
          data: Array.from({length: 100}, (_, i) => ({ 
            region: `Region ${i % 3}`, 
            sales: Math.floor(Math.random() * 10000),
            month: `2024-${String((i % 12) + 1).padStart(2, '0')}`
          })),
          aggregations: {
            count: true,
            sum: ['sales'],
            average: ['sales']
          }
        }
      },
      
      // 5 Email tasks
      { 
        type: 'email', 
        task_name: 'Welcome Email 1', 
        config: { 
          to: 'worker1@test.com', 
          subject: 'Test Email from Worker 1', 
          body: 'Testing parallel execution with multiple workers'
        }
      },
      { 
        type: 'email', 
        task_name: 'Welcome Email 2', 
        config: { 
          to: 'worker2@test.com', 
          subject: 'Test Email from Worker 2', 
          body: 'Testing parallel execution with multiple workers'
        }
      },
      { 
        type: 'email', 
        task_name: 'Welcome Email 3', 
        config: { 
          to: 'worker3@test.com', 
          subject: 'Test Email from Worker 3', 
          body: 'Testing parallel execution with multiple workers'
        }
      },
      { 
        type: 'email', 
        task_name: 'Welcome Email 4', 
        config: { 
          to: 'worker4@test.com', 
          subject: 'Test Email from Worker 4', 
          body: 'Testing parallel execution with multiple workers'
        }
      },
      { 
        type: 'email', 
        task_name: 'Welcome Email 5', 
        config: { 
          to: 'worker5@test.com', 
          subject: 'Test Email from Worker 5', 
          body: 'Testing parallel execution with multiple workers'
        }
      }
    ];

    console.log('Adding 15 tasks to workflow...');
    
    for (let i = 0; i < tasks.length; i++) {
      await axios.post(
        `${API_URL}/tasks`,
        {
          workflow_id: workflowId,  
          task_type: tasks[i].type,
          task_name: tasks[i].task_name,
          config: tasks[i].config,
          step_order: i + 1
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log(`    Task ${i + 1}/15 added (${tasks[i].type})`);
    }

    console.log('\n All 15 tasks added to workflow\n');
    return workflowId;

  } catch (error) {
    console.error('Error creating workflow:', error.response?.data || error.message);
    throw error;
  }
}

// Execute the workflow
async function executeWorkflow(workflowId) {
  try {
    console.log(' Executing workflow...\n');
    
    const response = await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    console.log('   Workflow execution started!');
    console.log(`   Workflow ID: ${workflowId}\n`);

  } catch (error) {
    console.error(' Error executing workflow:', error.response?.data || error.message);
    throw error;
  }
}

// Monitor workers
async function monitorWorkers() {
  console.log(' Monitoring workers (checking every 3 seconds for 30 seconds)...\n');
  
  let checks = 0;
  const maxChecks = 10;

  const interval = setInterval(async () => {
    checks++;
    
    try {
      const stats = await axios.get(`${API_URL}/workers/stats`);

      console.log(` Check ${checks}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
      
      console.log('\n Queue Stats:');
      console.log(`   Waiting:   ${stats.data.queue.waiting}`);
      console.log(`   Active:    ${stats.data.queue.active}`);
      console.log(`   Completed: ${stats.data.queue.completed}`);
      console.log(`   Failed:    ${stats.data.queue.failed}`);

      console.log('\n Active Workers:');
      if (stats.data.workers.active.length === 0) {
        console.log('   No active workers at this moment');
      } else {
        stats.data.workers.active.forEach(worker => {
          console.log(`   ${worker.worker_id} - Last seen: ${new Date(worker.last_seen).toLocaleTimeString()}`);
        });
      }

      console.log('\n Worker Stats:');
      if (stats.data.workers.stats.length === 0) {
        console.log('   No worker stats yet');
      } else {
        stats.data.workers.stats.forEach(worker => {
          const avgDuration = worker.avg_duration_seconds 
            ? `${parseFloat(worker.avg_duration_seconds).toFixed(2)}s`
            : 'N/A';
          console.log(`   ${worker.worker_id}:`);
          console.log(`      Total: ${worker.total_tasks} | Completed: ${worker.completed_tasks} | Failed: ${worker.failed_tasks} | Active: ${worker.active_tasks}`);
          console.log(`      Avg Duration: ${avgDuration}`);
        });
      }

      if (checks >= maxChecks) {
        clearInterval(interval);
        console.log('\n Monitoring complete!\n');
      }

    } catch (error) {
      console.error(' Error fetching stats:', error.message);
    }
  }, 3000);
}

// Main
async function main() {
  console.log('\n TESTING MULTIPLE WORKERS\n');
  console.log(' Multiple workers should be running!');
  console.log('   Run: npm run workers (in another terminal)\n');
  
  await login();
  const workflowId = await createTestWorkflow();
  await executeWorkflow(workflowId);
  await monitorWorkers();
}

main().catch(console.error);