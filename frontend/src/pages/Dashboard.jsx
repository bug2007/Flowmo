import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function Dashboard() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState({});  // Track which workflows are executing
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Fetch workflows on component mount and auto-refresh
  useEffect(() => {
    fetchWorkflows();
    
    // Only auto-refresh when NOT creating a workflow
    if (!creating && !newWorkflowName) {
      const interval = setInterval(() => {
        fetchWorkflows();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [creating, newWorkflowName]);

  const fetchWorkflows = async () => {
    try {
      if (loading) setLoading(true);  // Only show loading on first fetch
      const data = await api.getWorkflows(token);
      if (data.workflows) {
        setWorkflows(data.workflows);
      }
    } catch (err) {
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async (e) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;

    try {
      setCreating(true);
      setError('');
      const data = await api.createWorkflow(token, newWorkflowName);
      
      if (data.workflow) {
        setWorkflows([...workflows, data.workflow]);
        setNewWorkflowName('');
      } else {
        setError(data.error || 'Failed to create workflow');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const handleExecuteWorkflow = async (workflowId) => {
    try {
      setExecuting({ ...executing, [workflowId]: true });
      setError('');
      
      const data = await api.executeWorkflow(token, workflowId);
      
      if (data.message) {
        alert('Workflow execution started!');
        fetchWorkflows();  // Refresh to show updated status
      }
    } catch (err) {
      setError('Failed to execute workflow');
    } finally {
      setExecuting({ ...executing, [workflowId]: false });
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;

    try {
      await api.deleteWorkflow(token, id);
      setWorkflows(workflows.filter(w => w.id !== id));
    } catch (err) {
      setError('Failed to delete workflow');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'draft': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Flowmo Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/tasks')}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              View All Tasks
            </button>
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
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Create Workflow Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Workflow</h2>
          <form onSubmit={handleCreateWorkflow} className="flex gap-4">
            <input
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Enter workflow name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              type="submit"
              disabled={creating || !newWorkflowName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>

        {/* Workflows List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your Workflows</h2>
          </div>
          
          {workflows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No workflows yet. Create your first workflow above!
            </div>
          ) : (
            <div className="divide-y">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{workflow.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(workflow.status || 'draft')}`}>
                        {workflow.status || 'draft'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(workflow.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      disabled={executing[workflow.id] || workflow.status === 'running'}
                      className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded disabled:bg-gray-400"
                    >
                      {executing[workflow.id] ? 'Executing...' : 'Execute'}
                    </button>
                    <button
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                      className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

