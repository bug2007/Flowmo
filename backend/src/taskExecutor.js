// Handles the 4 task types:
// HTTP Task: Makes API calls using axios
// Email Task: Sends emails using nodemailer (test SMTP for now)
// File Task: Compresses/decompresses files
// Data Task: Filters, sorts, transforms JSON/array data
 
const axios = require('axios');                // A library for making HTTP requests (API calls). easier than fetch & automatically converts JSON.
const nodemailer = require('nodemailer');     // A library for sending emails.
const fs = require('fs').promises;         // The File System module (using Promises) for interacting with (reading/writing) files.
const path = require('path');              // A utility for handling and transforming file paths.
const archiver = require('archiver');     // A streaming library for creating archives (like ZIP files).
const unzipper = require('unzipper');     // A library used to extract/decompress ZIP files.

class TaskExecutor {
  
  // Execute HTTP/API Task. Handles sending requests to external web services.
  async executeHttpTask(config) {
    try {
      const { method, url, headers, body } = config;
      
      const response = await axios({  // Uses Axios to perform the request
        method: method || 'GET',      // get req by default.
        url,
        headers: headers || {},
        data: body || undefined,   // json body
        timeout: 30000 // 30 second timeout
      });
      
      return {
        success: true,
        result: {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
          headers: response.headers
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }

  // Execute Email Task
  async executeEmailTask(config) {
    try {
      const { to, subject, body, from } = config;
      
      // Create test email account for development (replace with real SMTP later)
      const testAccount = await nodemailer.createTestAccount();   // looks like: alexa.brown47@ethereal.email. actual email account used to send the mail.
      
      const transporter = nodemailer.createTransport({   // setting up the 'mailman' with SMTP settings (host, port, credentials)
        host: 'smtp.ethereal.email',      // btw, ethereal is a testing SMTP service that allows developers to send emails without actually delivering them to real recipients (for testing).
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      const info = await transporter.sendMail({       // send the email
        from: from || '"Flowmo" <flowmo@example.com>',    // how the sender appears to the recipient: e.g From: Flowmo flowmo@example.com
        to,
        subject,
        text: body,
        html: `<p>${body}</p>`
      });
      
      return {
        success: true,
        result: {
          messageId: info.messageId,
          previewUrl: nodemailer.getTestMessageUrl(info), // Generates a clickable URL to view the email in a browser e.g https://ethereal.email/message/WaQKMgKddxQDoou...
          accepted: info.accepted,
          rejected: info.rejected
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Execute File Task (compress/decompress)
  async executeFileTask(config) {
    try {
      const { operation, filePath, outputPath } = config;
      
      if (operation === 'compress') {
        return await this.compressFile(filePath, outputPath);   // zip the file
      } else if (operation === 'decompress') {
        return await this.decompressFile(filePath, outputPath);
      } else {
        return {
          success: false,
          error: 'Invalid operation. Use "compress" or "decompress"'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async compressFile(filePath, outputPath) {    // filePath: where the original file is, outputPath: where the zip file will be saved.
    return new Promise((resolve, reject) => {           // Promise: i promise i'll call u back when im finished. resolve = 'im done'. reject = 'something broke'.
      const output = fs.createWriteStream(outputPath);       // create an empty file at outputPath. opens a pipe to write data into it little by little.
      const archive = archiver('zip', { zlib: { level: 9 } });    // archiever = tool that creates zip files. 'zip' = zip format. 'level: 9' = max compression.  "Prepare a machine that knows how to zip files"
      
      output.on('close', () => {   // runs after the zip file is fully written. 'file is closed. zipping is done'
        resolve({          // if all goes well, Promise succeeds with success msg.
          success: true,
          result: {
            originalSize: archive.pointer(), // total bytes written to the zip file
            compressedPath: outputPath,  
            operation: 'compress'
          }
        });
      });
      
      archive.on('error', (err) => {  // if something goes wrong during zipping
        reject({
          success: false,
          error: err.message
        });
      });
      
      archive.pipe(output);   // archive (zip data) ----> output (zip file)
      archive.file(filePath, { name: path.basename(filePath) });   // Takes the file at filePath. Puts it inside the zip. e.g /uploads/report.pdf --> report.pdf inside zip
      archive.finalize();  // start zipping ugh.
    });
  }

  async decompressFile(filePath, outputPath) { // filepath: zip file. outputPath: folder where files will be extracted.
    try {
      await fs.createReadStream(filePath)   // open zip file. read it piece by piece.
        .pipe(unzipper.Extract({ path: outputPath }))   // Files get extracted as data flows. zip file --> unzipper --> output folder
        .promise(); // unzipper returns a Promise that resolves when extraction is complete.
       
      return {   // success response
        success: true,
        result: {
          extractedTo: outputPath,
          operation: 'decompress'
        }
      };
    } catch (error) {  // error response if extraction fails
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Execute Data Transformation Task
  async executeDataTask(config) {  // Take some data (usually an array of objects), filter it, sort/limit/select fields, and calculate numbers like count, sum, average. this is where u r implementing an mini-ETL pipeline.
    try {
      const { operation, data, filters, transformations } = config;  // config contains instructions for what to do with the data. { data: [...], filters: {...}, transformations: {...}, aggregations: {...}}

      let result = data; // will keep modifying result. result is the current version of data.
      
      // Apply filters
      if (filters && Array.isArray(result)) {   // Check if filters exist and data is an array. assumes data looks like : [{}, {}, {}]
        Object.entries(filters).forEach(([key, value]) => {     // Loop through each filter rule. assumes filter looks like this: filters = { status: "active", role: "admin" }
          result = result.filter(item => item[key] === value);   // Apply each filter one by one. Keep only items that match the filter condition. { status: "active" } ✅    { status: "inactive" } ❌
        });
      }
      
      // Apply transformations
      if (transformations && Array.isArray(result)) {  // check if instructions exist and data is an array
        if (transformations.sortBy) {   // Sorting the data e.g if config says sortBy: "age"
          result = result.sort((a, b) => {   // wanna sort the array by one field e.g age/price/score. compares 2 items at a time.
            const aVal = a[transformations.sortBy];
            const bVal = b[transformations.sortBy];
            return transformations.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
          });
        }
        
        if (transformations.limit) {   // Limit number of records if asked to. e.g limit: 5, so keep only first 5 items.
          result = result.slice(0, transformations.limit);
        }
        
        if (transformations.selectFields) { // Select only certain fields if asked to. e.g selectFields: ["name", "age"]
          result = result.map(item => {
            const newItem = {};
            transformations.selectFields.forEach(field => {
              newItem[field] = item[field];
            });
            return newItem;   // old: { name, age, salary, address }.   new: { name, age }
          });
        }
      }
      
      // Calculate aggregations if requested
      let aggregations = {};   // Will store things like: { count: 10, sum_salary: 50000 }
      if (config.aggregations && Array.isArray(result)) {   // Only calculate if requested.
        if (config.aggregations.count) {
          aggregations.count = result.length; // Count records (no. of rows)
        }
        if (config.aggregations.sum) {
          config.aggregations.sum.forEach(field => {
            aggregations[`sum_${field}`] = result.reduce((acc, item) => acc + (item[field] || 0), 0);
          });
        }
        if (config.aggregations.average) {  // calculate average for specified fields u r asked to calculate for
          config.aggregations.average.forEach(field => {
            const sum = result.reduce((acc, item) => acc + (item[field] || 0), 0);
            aggregations[`avg_${field}`] = sum / result.length;
          });
        }
      }
      
      return {
        success: true,
        result: {
          data: result, // transformed data 
          aggregations,  // numbers calculated
          recordCount: Array.isArray(result) ? result.length : 1 // no. of records in transformed data
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Main execution dispatcher
  async executeTask(taskType, config) {
    console.log(`Executing ${taskType} task...`);
    
    switch (taskType) {
      case 'http':
        return await this.executeHttpTask(config);
      case 'email':
        return await this.executeEmailTask(config);
      case 'file':
        return await this.executeFileTask(config);
      case 'data':
        return await this.executeDataTask(config);
      default:
        return {
          success: false,
          error: `Unknown task type: ${taskType}`
        };
    }
  }
}

module.exports = new TaskExecutor();