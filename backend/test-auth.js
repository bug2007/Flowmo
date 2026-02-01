// Test authentication endpoints

const testSignup = async () => {  // async allows to use await inside func
  const response = await fetch('http://localhost:4000/api/auth/signup', {  // fetch () sends an http req to server running on port 4000
    method: 'POST',  // tells server we sending data to create something new ( a new user)
    headers: { 'Content-Type': 'application/json' }, // tells server data is being sent in json formt
    body: JSON.stringify({       // the data being sent to server (user email, password, name)
      email: 'test@example3.com',
      password: 'password125',
      name: 'Test User3'
    })
  });
  const data = await response.json();   // extracts json body from server's response
  console.log('Signup response:', data);
  return data.token;
};

const testLogin = async () => {
  const response = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example3.com',
      password: 'password125'
    })
  });
  const data = await response.json();
  console.log('Login response:', data);
};

// Run tests
(async () => {
  await testSignup();
  await testLogin();
})();