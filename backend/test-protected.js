// Test protected routes with authentication

const testProtectedWithoutToken = async () => {
  console.log('\n Test 1: Access protected route WITHOUT token ===');
  const response = await fetch('http://localhost:4000/api/protected');
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

const testProtectedWithToken = async () => {
  console.log('\n Test 2: Login and get token ===');
  // First, login to get a token
  const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'password123'
    })
  });
  const loginData = await loginResponse.json();
  console.log('Login successful, got token');
  
  const token = loginData.token;

  console.log('\n Test 3: Access protected route WITH token ===');
  // Now use the token to access protected route
  const protectedResponse = await fetch('http://localhost:4000/api/protected', {
    headers: { 
      'Authorization': `Bearer ${token}`  // Add token here
    }
  });
  const protectedData = await protectedResponse.json();
  console.log('Status:', protectedResponse.status);
  console.log('Response:', protectedData);
};

const testProtectedWithInvalidToken = async () => {
  console.log('\n Test 4: Access protected route with INVALID token ===');
  const response = await fetch('http://localhost:4000/api/protected', {
    headers: { 
      'Authorization': 'Bearer invalid-fake-token-12345'
    }
  });
  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
};

// Run all tests
(async () => {
  await testProtectedWithoutToken();
  await testProtectedWithToken();
  await testProtectedWithInvalidToken();
})();