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

async function testPriorityQueue() {
  console.log('TESTING PRIORITY QUEUES\n');
  console.log('Creating 3 tasks with different priorities:');
  console.log('   Task A: Priority 30 (LOW)');
  console.log('   Task B: Priority 20 (MEDIUM)');
  console.log('   Task C: Priority 1  (HIGH - should run first)\n');

  try {
    // Create 3 tasks with different priorities
    const tasks = [
      {
        task_name: 'LOW Priority Task',
        priority: 30,
        config: { to: 'low@test.com', subject: 'LOW Priority', body: 'priority 30' }
      },
      {
        task_name: 'MEDIUM Priority Task',
        priority: 20,
        config: { to: 'medium@test.com', subject: 'MEDIUM Priority', body: 'priority 20' }
      },
      {
        task_name: 'HIGH Priority Task',
        priority: 1,
        config: { to: 'high@test.com', subject: 'HIGH Priority', body: 'priority 1' }
      }
    ];

    const createdTasks = [];

    // Create all tasks first WITHOUT executing
    for (const task of tasks) {
      const response = await axios.post(
        `${API_URL}/tasks`,
        {
          task_type: 'email',
          task_name: task.task_name,
          config: task.config,
          priority: task.priority
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      createdTasks.push(response.data.task);
      console.log(`Created: "${task.task_name}" (priority: ${task.priority}, id: ${response.data.task.id})`);
    }

    console.log('\nAll tasks created. Now queuing ALL at the same time...\n');

    // Queue ALL tasks simultaneously
    await Promise.all(
      createdTasks.map(task =>
        axios.post(
          `${API_URL}/tasks/${task.id}/execute`,
          {},
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
      )
    );

    console.log('All tasks queued simultaneously!\n');
    console.log('Monitoring execution order...\n');

    // Monitor which task completes first
    const completionOrder = [];
    let checks = 0;
    const maxChecks = 15;

    const interval = setInterval(async () => {
      checks++;

      try {
        const statuses = await Promise.all(
          createdTasks.map(task =>
            axios.get(`${API_URL}/tasks/${task.id}`, {
              headers: { Authorization: `Bearer ${authToken}` }
            })
          )
        );

        console.log(`Check ${checks}/${maxChecks}:`);
        statuses.forEach((response, index) => {
          const task = response.data.task;
          const priorityLabel = ['LOW', 'MEDIUM', 'HIGH'][index];
          console.log(`   ${priorityLabel} (priority ${task.priority}): ${task.status}`);

          // Track completion order
          if (task.status === 'success' && !completionOrder.find(t => t.id === task.id)) {
            completionOrder.push({
              id: task.id,
              name: task.task_name,
              priority: task.priority,
              completedAt: task.completed_at
            });
          }
        });

        // Check if all done
        const allDone = statuses.every(r => 
          r.data.task.status === 'success' || r.data.task.status === 'failed'
        );

        if (allDone || checks >= maxChecks) {
          clearInterval(interval);

          console.log('COMPLETION ORDER:');
+
          completionOrder
            .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
            .forEach((task, index) => {
              const medal = ['🥇', '🥈', '🥉'][index] || '  ';
              console.log(`${medal} #${index + 1}: "${task.name}" (priority: ${task.priority})`);
            });

          console.log('\n');

          // Check if HIGH priority ran first
          if (completionOrder[0]?.priority === 1) {
            console.log('SUCCESS! HIGH priority task ran first!');
          } else {
            console.log('High priority task did NOT run first.');
          }

          process.exit(0);
        }

      } catch (error) {
        console.error('Error checking status:', error.message);
      }
    }, 1000);

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('PRIORITY QUEUE TEST');

  console.log('   How Bull priority works:');
  console.log('   Lower number = Higher priority');
  console.log('   Priority 1 = Urgent (runs first)');
  console.log('   Priority 10 = Normal (default)');
  console.log('   Priority 30 = Low (runs last)\n');

  await login();
  await testPriorityQueue();
}

main().catch(console.error);