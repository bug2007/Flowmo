import { useState } from 'react';

export default function CreateTaskForm({ onClose, onTaskCreated, token }) {
  const [taskType, setTaskType] = useState('http');
  const [taskName, setTaskName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // HTTP task config
  const [httpMethod, setHttpMethod] = useState('GET');
  const [httpUrl, setHttpUrl] = useState('');
  const [httpHeaders, setHttpHeaders] = useState('');
  const [httpBody, setHttpBody] = useState('');

  // Email task config
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // File task config
  const [fileOperation, setFileOperation] = useState('compress');
  const [filePath, setFilePath] = useState('');
  const [fileOutputPath, setFileOutputPath] = useState('');

  // Data task config
  const [dataInput, setDataInput] = useState('');
  const [dataFilters, setDataFilters] = useState('');
  const [dataSortBy, setDataSortBy] = useState('');
  const [dataSortOrder, setDataSortOrder] = useState('asc');

  const buildConfig = () => {
    switch (taskType) {
      case 'http':
        const config = {
          method: httpMethod,
          url: httpUrl,
          headers: httpHeaders ? JSON.parse(httpHeaders) : {}
        };
        if (httpMethod !== 'GET' && httpBody) {
          config.body = JSON.parse(httpBody);
        }
        return config;

      case 'email':
        return {
          to: emailTo,
          subject: emailSubject,
          body: emailBody
        };

      case 'file':
        return {
          operation: fileOperation,
          filePath: filePath,
          outputPath: fileOutputPath
        };

      case 'data':
        return {
          operation: 'transform',
          data: JSON.parse(dataInput),
          filters: dataFilters ? JSON.parse(dataFilters) : {},
          transformations: {
            sortBy: dataSortBy || undefined,
            sortOrder: dataSortOrder
          }
        };

      default:
        return {};
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const config = buildConfig();
      
      const response = await fetch('http://localhost:4000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          task_type: taskType,
          task_name: taskName,
          config: config
        })
      });

      const data = await response.json();

      if (data.task) {
        onTaskCreated(data.task);
        onClose();
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (err) {
      setError('Invalid configuration. Check your JSON syntax.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-4 text-gray-900">Create New Task</h3>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Name
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g., Fetch Weather Data"
            />
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Type
            </label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="http">🌐 HTTP/API Request</option>
              <option value="email">📧 Email</option>
              <option value="file">📁 File Processing</option>
              <option value="data">📊 Data Transformation</option>
            </select>
          </div>

          {/* HTTP Task Config */}
          {taskType === 'http' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">HTTP Configuration</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method
                </label>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="https://exampleapi.com/data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Headers (JSON, optional)
                </label>
                <textarea
                  value={httpHeaders}
                  onChange={(e) => setHttpHeaders(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  rows="3"
                  placeholder='{"Authorization": "Bearer token"}'
                />
              </div>

              {httpMethod !== 'GET' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body (JSON, optional)
                  </label>
                  <textarea
                    value={httpBody}
                    onChange={(e) => setHttpBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                    rows="3"
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </div>
          )}

          {/* Email Task Config */}
          {taskType === 'email' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Email Configuration</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="recipient@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Email Subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  rows="4"
                  placeholder="Email message..."
                />
              </div>
            </div>
          )}

          {/* File Task Config */}
          {taskType === 'file' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">File Configuration</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation
                </label>
                <select
                  value={fileOperation}
                  onChange={(e) => setFileOperation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="compress">Compress</option>
                  <option value="decompress">Decompress</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input File Path
                </label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Path to file"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output File Path
                </label>
                <input
                  type="text"
                  value={fileOutputPath}
                  onChange={(e) => setFileOutputPath(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Path to output"
                />
              </div>
            </div>
          )}

          {/* Data Task Config */}
          {taskType === 'data' && (
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-medium text-gray-900">Data Configuration</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input Data (JSON Array)
                </label>
                <textarea
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  rows="4"
                  placeholder='[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filters (JSON, optional)
                </label>
                <textarea
                  value={dataFilters}
                  onChange={(e) => setDataFilters(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                  rows="2"
                  placeholder='{"age": 30}'
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By (field name, optional)
                  </label>
                  <input
                    type="text"
                    value={dataSortBy}
                    onChange={(e) => setDataSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <select
                    value={dataSortOrder}
                    onChange={(e) => setDataSortOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {creating ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}