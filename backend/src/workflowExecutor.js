const pool = require('./db');
const { addTaskToQueue } = require('./queueManager');
const templateParser = require('./templateParser');
const nodemailer = require('nodemailer');

class WorkflowExecutor {
  
  // Execute a workflow - runs all tasks in order
  async executeWorkflow(workflowId, userId) {
    const client = await pool.connect();
    
    try {
      // Get workflow
      const workflowResult = await client.query(
        'SELECT * FROM workflows WHERE id = $1 AND user_id = $2',
        [workflowId, userId]
      );
      
      if (workflowResult.rows.length === 0) {
        throw new Error('Workflow not found');
      }
      
      const workflow = workflowResult.rows[0];
      
      // Check if already running
      if (workflow.status === 'running') {
        throw new Error('Workflow is already running');
      }
      
      // Get all tasks for this workflow, ordered by step_order
      const tasksResult = await client.query(
        'SELECT * FROM tasks WHERE workflow_id = $1 ORDER BY step_order ASC',
        [workflowId]
      );
      
      if (tasksResult.rows.length === 0) {
        throw new Error('No tasks found in workflow');
      }
      
      const tasks = tasksResult.rows;
      
      // Update workflow status to running
      await client.query(
        'UPDATE workflows SET status = $1, started_at = NOW() WHERE id = $2',
        ['running', workflowId]
      );
      
      // Queue the first task
      const firstTask = tasks[0];
      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['queued', firstTask.id]
      );
      
      await addTaskToQueue({
        id: firstTask.id,
        task_type: firstTask.task_type,
        config: firstTask.config,
        workflow_id: workflowId,
        step_order: firstTask.step_order,
        priority: firstTask.priority,
        scheduled_for: firstTask.scheduled_for ? new Date(firstTask.scheduled_for).toISOString() : null,
      });
      
      console.log(`Workflow ${workflowId} started - queued first task (step ${firstTask.step_order})`);
      
      return {
        success: true,
        workflowId,
        status: 'running',
        firstTaskId: firstTask.id,
      };
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Called by worker when a task completes - queues next step
  async onTaskComplete(taskId, taskResult) {   // Task 1 finishes. worker calls onTaskComplete(task1) - finds next task (Task 2), queues Task 2. Task 2 finishes. worker calls onTaskComplete(task2) - finds next task (Task 3), queues Task 3.
    const client = await pool.connect();
    
    try {
      // Get the completed task
      const taskQuery = await client.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      
      const task = taskQuery.rows[0];
      
      // If task is not part of a workflow, nothing to do
      if (!task.workflow_id) {
        return;
      }
      
      console.log(`Task ${taskId} completed (workflow ${task.workflow_id}, step ${task.step_order})`);
      
      // Get next task in workflow
      const nextTaskQuery = await client.query(
        `SELECT * FROM tasks 
         WHERE workflow_id = $1 
         AND step_order > $2 
         ORDER BY step_order ASC 
         LIMIT 1`,
        [task.workflow_id, task.step_order]
      );
      
      if (nextTaskQuery.rows.length === 0) {
        // No more tasks - workflow complete!
        await client.query(
          'UPDATE workflows SET status = $1, completed_at = NOW() WHERE id = $2',
          ['completed', task.workflow_id]
        );
        console.log(`Workflow ${task.workflow_id} completed successfully`);
        await sendWorkflowNotification(task.workflow_id, 'completed');
        return;
      }
      
      // Queue next task
      const nextTask = nextTaskQuery.rows[0];

      // Fetch ALL previous task results for this workflow
      const previousTasksQuery = await client.query(
        `SELECT step_order, result FROM tasks 
        WHERE workflow_id = $1 
        AND step_order < $2 
        AND status = 'success'
        ORDER BY step_order ASC`,
        [task.workflow_id, nextTask.step_order]
      );

      //Build a map of step_order -> result
      const previousTasksResults = {};
      previousTasksQuery.rows.forEach(row => {
        if (row.result) {
          // Keeping the full structure so {{stepX.result.field}} works
          previousTasksResults[row.step_order] = row.result;
        }
      });

      console.log('Available for templates:', JSON.stringify(previousTasksResults, null, 2).substring(0, 500));

      console.log('Previous results:', JSON.stringify(previousTasksResults, null, 2));

      let nextConfig = templateParser.parseConfig(nextTask.config, previousTasksResults);   // before adding the next task to queue to be executed, we translate its config values. for example, for task 2, user decides its config --> step1.result.data. using the templateParser.parseConfig, we find out the actual value of step1.result.data to give it to task 2 as its config.
      
      console.log(`Parsed config for step ${nextTask.step_order}:`, JSON.stringify(nextConfig).substring(0, 100));

      await client.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        ['queued', nextTask.id]
      );
      
      await addTaskToQueue({
        id: nextTask.id,
        task_type: nextTask.task_type,
        config: nextConfig,
        workflow_id: nextTask.workflow_id,
        step_order: nextTask.step_order,
        priority: nextTask.priority,
        scheduled_for: nextTask.scheduled_for ? new Date(nextTask.scheduled_for).toISOString() : null,
      });
      
      console.log(`Workflow ${task.workflow_id} - queued next task (step ${nextTask.step_order})`);
      
    } catch (error) {
      console.error('Error in onTaskComplete:', error);
      
      // Mark workflow as failed
      if (task && task.workflow_id) {
        await client.query(
          'UPDATE workflows SET status = $1 WHERE id = $2',
          ['failed', task.workflow_id]
        );
      }
    } finally {
      client.release();
    }
  }
  
  // Called by worker when a task fails
  async onTaskFail(taskId, error) {
    try {
      // Get the failed task
      const taskQuery = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      
      const task = taskQuery.rows[0];
      
      // If task is part of a workflow, mark workflow as failed
      if (task && task.workflow_id) {
        await pool.query(
          'UPDATE workflows SET status = $1 WHERE id = $2',
          ['failed', task.workflow_id]
        );
        console.log(`Workflow ${task.workflow_id} failed at step ${task.step_order}`);
        await sendWorkflowNotification(task.workflow_id, 'failed');
      }
    } catch (err) {
      console.error('Error in onTaskFail:', err);
    }
  }
}

async function sendWorkflowNotification(workflowId, status) {
  try {
    // Get workflow + user email
    const result = await pool.query(
      `SELECT w.name, w.id, u.email, u.name as user_name
       FROM workflows w
       JOIN users u ON w.user_id = u.id
       WHERE w.id = $1`,
      [workflowId]
    );

    if (result.rows.length === 0) return;

    const { name: workflowName, email, user_name } = result.rows[0];

    // Create test email account
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const isSuccess = status === 'completed';
    const subject = isSuccess
      ? ` Workflow "${workflowName}" completed successfully!`
      : ` Workflow "${workflowName}" failed`;

    const body = isSuccess
      ? `Hi ${user_name},\n\nYour workflow "${workflowName}" has completed successfully!\n\nWorkflow ID: ${workflowId}\nStatus: Completed \nTime: ${new Date().toLocaleString()}`
      : `Hi ${user_name},\n\nYour workflow "${workflowName}" has failed.\n\nWorkflow ID: ${workflowId}\nStatus: Failed \nTime: ${new Date().toLocaleString()}\n\nPlease check your tasks for errors.`;

    const info = await transporter.sendMail({
      from: '"Flowmo" <flowmo@example.com>',
      to: email,
      subject,
      text: body,
      html: `<pre>${body}</pre>`
    });

    console.log(`   Notification sent for workflow ${workflowId} (${status})`);
    console.log(`   Preview: ${nodemailer.getTestMessageUrl(info)}`);

  } catch (error) {
    console.error(' Failed to send notification:', error.message);
  }
}

module.exports = new WorkflowExecutor();