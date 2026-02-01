import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import CreateTaskForm from '../components/CreateTaskForm';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);   // Store list of tasks
  const [loading, setLoading] = useState(true);  // Track loading state
  const [error, setError] = useState('');  // Store error message
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [executing, setExecuting] = useState({});  // Track which task is currently executing
  const [queueStats, setQueueStats] = useState(null);
  const navigate = useNavigate();   // Function to change routes/pages

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {  
    fetchTasks(); // Run fetchTasks() once when page loads
    fetchQueueStats();

    // Only auto-refresh when modal is closed
    if (!showCreateModal) {
      const interval = setInterval(() => {
        fetchTasks();
        fetchQueueStats();
      }, 2000);
    
      // Cleanup: stop polling when component unmounts or modal opens
      return () => clearInterval(interval);
    }
  }, [showCreateModal]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks(token);
      if (data.tasks) {
        setTasks(data.tasks);   // save previously created tasks to state/React's memory.
      }
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const data = await api.getQueueStats(token);
      if (data.stats) {
        setQueueStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch queue stats');
    }
  };

  const handleExecuteTask = async (taskId) => { // run this func when 'Execute' is clicked by user.
    try {
      setExecuting({ ...executing, [taskId]: true }); // mark this task as executing e.g { 12: true, 15: false }. meaning task 12 is executing, task 15 is not.
      setError('');
      
      const data = await api.executeTask(token, taskId);
      
      if (data.task) {
        // Update task in list
        setTasks(tasks.map(t => t.id === taskId ? data.task : t));
        
        // Show success message
        if (data.task.status === 'success') {
          alert('Task executed successfully!');
        } else if (data.willRetry) {
          alert('Task failed but will retry');
        } else {
          alert('Task execution failed');
        }
      }
    } catch (err) {
      setError('Failed to execute task');
    } finally {
      setExecuting({ ...executing, [taskId]: false });  // Mark task as finished
    }
  };

  const handleDeleteTask = async (taskId) => {  // run when 'Delete' is clicked by user
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.deleteTask(token, taskId);
      setTasks(tasks.filter(t => t.id !== taskId));  // Remove task from UI
    } catch (err) {
      setError('Failed to delete task');
    }
  };

  const handleRetryTask = async (taskId) => {
    try {
      setError('');
      const data = await api.retryTask(token, taskId);
      
      if (data.message) {
        fetchTasks(); // Refresh to show updated status
        fetchQueueStats();
        alert('Task queued for retry!');

      }
    } catch (err) {
      setError('Failed to retry task');
    }
  };

  const handleLogout = () => {  // run when 'Logout' is clicked
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusColor = (status) => {  // Return CSS classes based on task status
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'queued': return 'text-yellow-600 bg-yellow-50';
      case 'pending': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';   // default means pending anyway
    }
  };

  const getTaskTypeIcon = (type) => {   // Return emoji/icon based on task type
    switch (type) {
      case 'http': return '🌐';
      case 'email': return '📧';
      case 'file': return '📁';
      case 'data': return '📊';
      default: return '📋';
    }
  };

  if (loading) {  // Show “Loading…” while fetching data
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (  // Show error message if exists
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Create Task Button and Queue Stats */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Create New Task
          </button>
          
          {queueStats && (
            <div className="flex gap-4 bg-white px-6 py-3 rounded-lg shadow">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{queueStats.waiting}</div>
                <div className="text-xs text-gray-500">Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{queueStats.active}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStats.success}</div>
                <div className="text-xs text-gray-500">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">All Tasks</h2>
          </div>
          
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tasks yet. Create your first task!
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map((task) => (   // loop thru tasks and render each task
                <div key={task.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTaskTypeIcon(task.task_type)}</span>
                        <h3 className="font-medium text-gray-900">{task.task_name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Type: {task.task_type} | Created: {new Date(task.created_at).toLocaleString()}
                      </p>
                      {task.error_message && (
                        <p className="text-sm text-red-600 mt-1">Error: {task.error_message}</p>
                      )}
                      {task.retry_count > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          Retries: {task.retry_count}/{task.max_retries}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {task.status === 'failed' ? (
                        <button
                          onClick={() => handleRetryTask(task.id)}
                          className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded"
                        >
                          Retry
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExecuteTask(task.id)}
                          disabled={executing[task.id] || task.status === 'running' || task.status === 'queued'}
                          className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-400"
                        >
                          {executing[task.id] ? 'Executing...' : 'Execute'}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Task Modal - Placeholder */}
      {showCreateModal && (
          <CreateTaskForm
              onClose={() => setShowCreateModal(false)}
              onTaskCreated={(newTask) => {
                  setTasks([newTask, ...tasks]);
              }}
              token={token}
          />
      )}
    </div>
  );
}

