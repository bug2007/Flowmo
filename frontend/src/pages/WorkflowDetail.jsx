import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import TemplateVariableHelper from '../components/TemplateVariableHelper';

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  
  // New task form
  const [newTask, setNewTask] = useState({
    task_name: '',
    task_type: 'http',
    step_order: 1,
    config: {},
    priority: 10,          
    scheduled_for: null
  });

  const [focusedField, setFocusedField] = useState(null);  // Track which input field is currently selected (clicked). e.g if user clicks inside Subject input, then focusedField= 'subject'. This is used to know where to insert the template variable.
  const [showTemplateHelper, setShowTemplateHelper] = useState(false);  // Show/hide helper. false: hidden. true: visible. When user clicks on config input field, show the helper to suggest template variables that can be used in that field. When user clicks outside, hide the helper. 
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchWorkflowData();
    
    // Only auto-refresh when form is closed
    if (!showAddTask) {
      const interval = setInterval(() => {
        fetchWorkflowData();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [id, showAddTask]);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      
      // Fetch workflow
      const workflowData = await api.getWorkflow(token, id);
      setWorkflow(workflowData.workflow);
      
      // Fetch tasks for this workflow
      const tasksData = await api.getWorkflowTasks(token, id);
      setTasks(tasksData.tasks || []);
      
    } catch (err) {
      setError('Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      const datetimeInput = document.getElementById('schedule-datetime').value;
      let scheduled_for = null;

      if (datetimeInput.trim()) {
        scheduled_for = new Date(datetimeInput).toISOString();
      }
      const taskData = {
        workflow_id: parseInt(id),
        task_name: newTask.task_name,
        task_type: newTask.task_type,
        step_order: newTask.step_order,
        config: newTask.config,
        priority: newTask.priority,                              
        scheduled_for: scheduled_for
      };
      
      const data = await api.createTask(token, taskData);
      
      if (data.task) {
        setTasks([...tasks, data.task].sort((a, b) => a.step_order - b.step_order));
        setShowAddTask(false);
        setNewTask({
          task_name: '',
          task_type: 'http',
          step_order: tasks.length + 1,
          config: {},
          priority: 10,          
          scheduled_for: null
        });
      }
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const handleConfigChange = (field, value) => {  // When the user types into one config field (like url or method), update only that field without deleting the rest.
    setNewTask({
      ...newTask,
      config: {                  // Before--> config: { url: "https://api.com", method: "GET"}. After--> config: { url: "https://google.com", method: "GET"}. Only Url updated. method preserved.
        ...newTask.config,
        [field]: value
      }
    });
  };

  const insertTemplateVariable = (variable) => { // runs when user clicks a template variable button in the helper. It inserts the variable into the currently focused config input field (like url or method). For example, if user clicks on "Insert {{step1.result.status}}" while the url field is focused, it will insert that variable into the url field value. So if url was "https://api.com" it becomes "https://api.com{{step1.result.status}}". This allows users to easily use outputs from previous steps in their task configurations.
    if (!focusedField) return;
    
    // Get current value of focused field
    const currentValue = newTask.config[focusedField] || '';
    
    // Insert variable at the end (can make this smarter later)
    const newValue = currentValue + variable;
    
    // Update the field
    handleConfigChange(focusedField, newValue);
  };  

  const renderConfigForm = () => {
    switch (newTask.task_type) {
      case 'http':
        return (
          <>
            <input
              type="text"
              placeholder="URL"
              value={newTask.config.url || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              onFocus={() => setFocusedField('url')}
              className="w-full px-3 py-2 border rounded text-gray-900 mb-2"
              required
            />
            <select
              value={newTask.config.method || 'GET'}
              onChange={(e) => handleConfigChange('method', e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-900"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </>
        );
      case 'email':
        return (
          <>
            <input
              type="text"
              placeholder="To"
              value={newTask.config.to || ''}
              onChange={(e) => handleConfigChange('to', e.target.value)}
              onFocus={() => setFocusedField('to')}
              className="w-full px-3 py-2 border rounded text-gray-900 mb-2"
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={newTask.config.subject || ''}
              onChange={(e) => handleConfigChange('subject', e.target.value)}
              onFocus={() => setFocusedField('subject')}
              className="w-full px-3 py-2 border rounded text-gray-900 mb-2"
              required
            />
            <textarea
              placeholder="Body"
              value={newTask.config.body || ''}
              onChange={(e) => handleConfigChange('body', e.target.value)}
              onFocus={() => setFocusedField('body')}
              className="w-full px-3 py-2 border rounded text-gray-900"
              rows="3"
              required
            />
          </>
        );
      case 'file':
        return (
          <>
            <select
              value={newTask.config.operation || 'compress'}
              onChange={(e) => handleConfigChange('operation', e.target.value)}
              className="w-full px-3 py-2 border rounded text-gray-900 mb-2"
            >
              <option>compress</option>
              <option>decompress</option>
            </select>
            <input
              type="text"
              placeholder="File Path"
              value={newTask.config.filePath || ''}
              onChange={(e) => handleConfigChange('filePath', e.target.value)}
              onFocus={() => setFocusedField('filePath')}
              className="w-full px-3 py-2 border rounded text-gray-900 mb-2"
              required
            />
            <input
              type="text"
              placeholder="Output Path"
              value={newTask.config.outputPath || ''}
              onChange={(e) => handleConfigChange('outputPath', e.target.value)}
              onFocus={() => setFocusedField('outputPath')}
              className="w-full px-3 py-2 border rounded text-gray-900"
              required
            />
          </>
        );
      case 'data':
        return (
          <textarea
            placeholder='Data (JSON array, e.g., [{"name":"Alice","age":30}])'
            value={newTask.config.data ? JSON.stringify(newTask.config.data) : ''}
            onChange={(e) => {
              try {
                handleConfigChange('data', JSON.parse(e.target.value));
              } catch (err) {
                // Invalid JSON, just store as string
              }
            }}
            onFocus={() => setFocusedField('data')}
            className="w-full px-3 py-2 border rounded text-gray-900"
            rows="4"
          />
        );
      default:
        return null;
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
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              {workflow?.name || 'Workflow'}
            </h1>
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

        {/* Workflow Progress */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Workflow Progress</h3>
              <span className="text-sm text-gray-600">
                {tasks.filter(t => t.status === 'success').length} / {tasks.length} tasks completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  tasks.filter(t => t.status === 'failed').length > 0 ? 'bg-red-500' :
                  tasks.filter(t => t.status === 'success').length === tasks.length ? 'bg-green-500' :
                  'bg-blue-500'
                }`}
                style={{ 
                  width: `${(tasks.filter(t => t.status === 'success' || t.status === 'failed').length / tasks.length) * 100}%` 
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>✅ {tasks.filter(t => t.status === 'success').length} success</span>
              <span>⚙️ {tasks.filter(t => t.status === 'running').length} running</span>
              <span>⏳ {tasks.filter(t => t.status === 'pending' || t.status === 'queued').length} waiting</span>
              <span>❌ {tasks.filter(t => t.status === 'failed').length} failed</span>
            </div>
          </div>
        )}
        {/* Add Task Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showAddTask ? 'Cancel' : '+ Add Task to Workflow'}
          </button>
        </div>

        {/* Add Task Form */}
        {showAddTask && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Add New Task</h3>
            <form onSubmit={handleAddTask}>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Task Name"
                  value={newTask.task_name}
                  onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-gray-900"
                  required
                />
                
                <select
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value, config: {} })}
                  className="w-full px-3 py-2 border rounded text-gray-900"
                >
                  <option value="http">HTTP Request</option>
                  <option value="email">Email</option>
                  <option value="file">File Operation</option>
                  <option value="data">Data Processing</option>
                </select>

                <input
                  type="number"
                  placeholder="Step Order"
                  value={newTask.step_order}
                  onChange={(e) => setNewTask({ ...newTask, step_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded text-gray-900"
                  min="1"
                  required
                />

                {/* PRIORITY INPUT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (lower = more urgent)
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                  >
                    <option value="1">🔴 Urgent (Priority 1)</option>
                    <option value="5">🟠 High (Priority 5)</option>
                    <option value="10">🟢 Normal (Priority 10)</option>
                    <option value="20">🔵 Low (Priority 20)</option>
                    <option value="30">⚪ Very Low (Priority 30)</option>
                  </select>
                </div>
                
                {/* SCHEDULE INPUT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule for later (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="2026-02-17T14:30:00"
                    id="schedule-datetime"
                    className="w-full px-3 py-2 border rounded text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: YYYY-MM-DDTHH:MM:SS or leave empty to run immediately
                  </p>
                </div>

                {/*Template Variable Helper */}
                {newTask.step_order > 1 && (
                  <TemplateVariableHelper 
                    currentStepOrder={newTask.step_order}
                    tasks={tasks}
                    onInsert={insertTemplateVariable}
                  />
                )}

                {renderConfigForm()}

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Workflow Tasks</h2>
          </div>
          
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No tasks in this workflow yet. Add your first task above!
            </div>
          ) : (
            <div className="p-6">
              {tasks.map((task, index) => (
                <div key={task.id}>
                <div key={task.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                      {task.step_order}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{task.task_name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          task.status === 'success' ? 'bg-green-100 text-green-700' :
                          task.status === 'failed' ? 'bg-red-100 text-red-700' :
                          task.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                          task.status === 'queued' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.status === 'running' ? '⚙️ Running...' : 
                          task.status === 'success' ? '✅ Success' :
                          task.status === 'failed' ? '❌ Failed' :
                          task.status === 'queued' ? '⏳ Queued' :
                          task.status || 'pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Type: {task.task_type}</p>
                      {task.worker_id && (
                        <p className="text-xs text-blue-600 font-mono">
                          👷 Worker: {task.worker_id}
                        </p>
                      )}

                      {/*PRIORITY DISPLAY */}
                      {task.priority && task.priority !== 10 && (
                        <p className="text-xs text-gray-600">
                          🎯 Priority: {task.priority} {
                            task.priority <= 5 ? '(Urgent)' :
                            task.priority <= 10 ? '(Normal)' :
                            task.priority <= 20 ? '(Low)' : '(Very Low)'
                          }
                        </p>
                      )}

                      {/*SCHEDULED TIME DISPLAY */}
                      {task.scheduled_for && (
                        <p className="text-xs text-purple-600">
                          ⏰ Scheduled: {new Date(task.scheduled_for).toLocaleString()}
                        </p>
                      )}

                      {task.started_at && (
                        <p className="text-xs text-gray-400">
                          Started: {new Date(task.started_at).toLocaleTimeString()}
                        </p>
                      )}
                      {task.completed_at && (
                        <p className="text-xs text-gray-400">
                          Completed: {new Date(task.completed_at).toLocaleTimeString()}
                        </p>
                      )}
                      {task.error_message && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {task.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow between tasks */}
                {index < tasks.length - 1 && (
                  <div className="flex justify-center py-3">
                    <div className="text-2xl text-gray-400">↓</div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

