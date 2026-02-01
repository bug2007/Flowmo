// this file will handle all API calls to the backend

const API_URL = 'http://localhost:4000/api';

export const api = {
  // Authentication endpoints
  signup: async (name, email, password) => {
    const response = await fetch(`${API_URL}/auth/signup`, {  // send a post req
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return response.json();
  },

  // Workflows endpoints
  getWorkflows: async (token) => {
    const response = await fetch(`${API_URL}/workflows`, {  // send a get req by default
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  createWorkflow: async (token, name) => {
    const response = await fetch(`${API_URL}/workflows`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });
    return response.json();
  },

  getWorkflow: async (token, id) => {
    const response = await fetch(`${API_URL}/workflows/${id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  deleteWorkflow: async (token, id) => {
    const response = await fetch(`${API_URL}/workflows/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  // Tasks endpoints
  getTasks: async (token) => {
    const response = await fetch(`${API_URL}/tasks`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  getWorkflowTasks: async (token, workflowId) => {
    const response = await fetch(`${API_URL}/tasks/workflow/${workflowId}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  getTask: async (token, id) => {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  createTask: async (token, taskData) => {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    return response.json();
  },

  executeTask: async (token, id) => {
    const response = await fetch(`${API_URL}/tasks/${id}/execute`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  retryTask: async (token, id) => {
    const response = await fetch(`${API_URL}/tasks/${id}/retry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  deleteTask: async (token, id) => {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },

  getQueueStats: async (token) => {
    const response = await fetch(`${API_URL}/tasks/stats/combined`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  },
};

  


