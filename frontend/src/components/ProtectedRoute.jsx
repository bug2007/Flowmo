// This component will protect the dashboard - if user isn't logged in, redirect them to login. since this is a component, it can be reused for other protected routes like settings, profile, etc.

import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const [isValid, setIsValid] = useState(null); // null = checking, true = valid, false = invalid
  const token = localStorage.getItem('token');
  
  useEffect(() => {
    // If no token, immediately invalid
    if (!token) {
      setIsValid(false);
      return;
    }

    // Verify token with backend
    const verifyToken = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/workflows', { // tryna access this protected route with current token. remember, that route uses auth middleware to verify token, thats why we using this route to verify token.
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setIsValid(true);  // Token is valid
        } else {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsValid(false);
        }
      } catch (err) {
        // Network error or backend down
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsValid(false);
      }
    };

    verifyToken();
  }, [token]);

  // Still checking token
  if (isValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  // Token invalid - redirect to login
  if (!isValid) {
    return <Navigate to="/login" replace />;
  }
  
  // Token valid - show protected content. When we say "protected content", we mean the actual page component we want to show (Dashboard, Settings, etc.) - but only if the user is authenticated.
  return children;  // return Dashboard component.
}