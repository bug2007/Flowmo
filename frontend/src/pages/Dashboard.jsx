import { useState, useEffect } from 'react';  // to keep track of things that change on the screen
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function Dashboard() {
  const [workflows, setWorkflows] = useState([]);   // to store the list of workflows
  const [loading, setLoading] = useState(true);   // A true/false switch. If true, it shows a "Loading..." message.
  const [error, setError] = useState('');
  const [newWorkflowName, setNewWorkflowName] = useState(''); // to store the name of the new workflow being created. Keeps track of what the user is currently typing in the input box
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');    // "VIP Pass." It’s a secret string stored in browser memory (localStorage) that proves to the backend that you are logged in.

  // Fetch workflows on component mount
  useEffect(() => {     // This says: "As soon as this component shows up on the screen, run the fetchWorkflows function immediately."
    fetchWorkflows();  
  }, []);    // empty array means "run only once when component mounts". Runs after the first render. Doesnt run again on re-renders so that data isnt fetched on every render. component re-renders happen when states or props change.

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
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

  const handleCreateWorkflow = async (e) => {  // when we click 'Create', it sends the new workflow name to the backend. If the backend says "OK," it adds that new item to the list on our screen without refreshing the page.
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

  const handleDeleteWorkflow = async (id) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return; // pops up a 'Are u sure?' box. If you say yes, it tells the backend to delete it and then removes it from the list in React's memory.

    try {
      await api.deleteWorkflow(token, id);
      setWorkflows(workflows.filter(w => w.id !== id));
    } catch (err) {
      setError('Failed to delete workflow');
    }
  };

  const handleLogout = () => {         // removes your token from frontend local storage and navigates u back to the login page, alright, but token is still valid on backend until its characters r changed or it expires - meaning, that token can still be used to call protected apis. 
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
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
            <span className="text-sm text-gray-600">Welcome, {user.name}</span>  {/* earlier we did: const user = JSON.parse(localStorage.getItem('user') || '{}');} */} 
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
              {workflows.map((workflow) => (  // loops thru each workflow in the workflows array and displays it on the screen. this is how the worlfows array look like: workflows = [{ id: 1, name: "My Workflow", ... }]
                <div key={workflow.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <h3 className="font-medium text-gray-900">{workflow.name}</h3>  {/* displaying each workflow on the screen */}
                    <p className="text-sm text-gray-500">
                      Created: {new Date(workflow.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
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