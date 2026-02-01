// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';  
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks'; 
import ProtectedRoute from './components/ProtectedRoute';  

import './App.css'

// these r frontend routes. when u, for example, click submit on ur form, the frontend sends a request to a backend API. API goes ahead and fetches data from the database and brings it back to u.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />  
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} /> 

        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard /> {/* This is the children that is being returned in ProtectedRoute.jsx */}
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>

  );
}

export default App;

