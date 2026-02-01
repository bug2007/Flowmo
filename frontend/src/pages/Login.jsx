// React hooks

import { useState } from 'react';  // lets the page remember things (like what the user typed in a box).
import { useNavigate } from 'react-router-dom';    // lets us "programmatically" change pages (e.g., jumping from Login to Dashboard).
import { api } from '../utils/api';  // contains actual logic to talk to backend

export default function Login() {
  const [email, setEmail] = useState('');   // email/password: store exactly what the user is currently typing.
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');       // If the login fails (e.g., wrong password), store the error message here to show it on the screen.
  const [loading, setLoading] = useState(false);   // turn it to true while waiting for the server so we can disable the button (preventing double-clicks).
  const navigate = useNavigate();  

  const handleSubmit = async (e) => {   // This function runs when the user clicks the "Login" button.
    e.preventDefault(); // Prevents the browser from refreshing the whole page
    setError('');   // Clear any old errors
    setLoading(true);   // Start the "loading" state

    try {
      const data = await api.login(email, password);
      
      if (data.token) {
        // Save token to localStorage
        localStorage.setItem('token', data.token);  // Save the "Key" (token) in the browser
        localStorage.setItem('user', JSON.stringify(data.user));  // Save user info (id, email, name)
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed'); // 'Server error' || 'Login failed'
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false); // Stop the "loading" state regardless of success or failure.  If you use a return statement inside your try or catch block, the function stops immediately. Any code after the blocks will never run. But code inside finally always runs, even if you returned earlier.
    }
  };

  return (   // JSX that determines what the user sees on the page
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Login to Flowmo</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">  
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}  // updates state everytime u press a key
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}  // grays out the button while the server is thinking so the user doesn't spam the login request.
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Don't have an account? Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}