// tests a workflow that compresses a file, uploads it to a cloud storage (simulated with httpbin), and sends an email notification. this tests whether the file task can perform compression and pass the resulting file info to subsequent tasks correctly.
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const API_URL = 'http://localhost:4000/api';

async function testFileCompressUpload() {
  try {
    console.log('Test 4: File Processing (File Compress -> HTTP Upload -> Email)\n');
    
    // Create a test file to compress
    const testFilePath = path.join(__dirname, 'test-data.txt');
    await fs.writeFile(testFilePath, 'This is test data for compression\nLine 2\nLine 3', 'utf-8');
    console.log('Created test file\n');
    
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example3.com',
      password: 'password125'
    });
    const token = loginRes.data.token;
    
    // Create workflow
    const workflowRes = await axios.post(
      `${API_URL}/workflows`,
      { name: 'File Processing Pipeline' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const workflowId = workflowRes.data.workflow.id;
    console.log(`Workflow created (ID: ${workflowId})\n`);
    
    // Task 1 - Compress file
    console.log('Creating Task 1: Compress File...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 1: Compress File',
        task_type: 'file',
        step_order: 1,
        config: {
          operation: 'compress',
          filePath: testFilePath,
          outputPath: './exports/compressed.zip'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 1 created\n');
    
    // Task 2 - Upload to cloud (simulated with httpbin)
    console.log('Creating Task 2: Upload File...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 2: Upload to Cloud',
        task_type: 'http',
        step_order: 2,
        config: {
          method: 'POST',
          url: 'https://httpbin.org/post',
          body: {
            filename: 'compressed.zip',
            path: '{{step1.compressedPath}}',
            size: '{{step1.originalSize}}'
          }
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 2 created\n');
    
    // Task 3 - Send notification
    console.log('Creating Task 3: Send Notification...');
    await axios.post(
      `${API_URL}/tasks`,
      {
        workflow_id: workflowId,
        task_name: 'Step 3: Notify User',
        task_type: 'email',
        step_order: 3,
        config: {
          to: 'user@example.com',
          subject: 'File Upload Complete',
          body: 'Your file has been compressed and uploaded! Original size: {{step1.originalSize}} bytes. Compressed file: {{step1.compressedPath}}'
        }
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Task 3 created\n');
    
    // Execute
    console.log('Executing workflow...');
    await axios.post(
      `${API_URL}/workflows/${workflowId}/execute`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Workflow started!\n');
    console.log('Expected: File compressed -> uploaded -> email notification sent\n');
    console.log('Check backend/exports/compressed.zip\n');
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testFileCompressUpload();