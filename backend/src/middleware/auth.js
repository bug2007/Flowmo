// middleware function for user authentication to see if users r logged in before accessing protected routes like GET /api/workflows using jwt.verify(). 
// think of it like a security guard standing at the door of a VIP club. Its job is to check every person's ID (the token) before letting them pass to the actual party (your API routes)

const jwt = require('jsonwebtoken'); // stores the jsonwebtoken library, which contains the tools needed to "sign" (create) and "verify" (read) tokens.

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';  // private "password" known only to your server. If someone changes even one letter in the token, the library uses this secret to detect that the token has been tampered with

const authenticateToken = (req, res, next) => { // req (Request): Stores everything the user sent (headers, body, URL).  res (Response): The object used to send data back to the user. next: A function that tells Express, "This person is okay, move them to the next function."
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];  // Example Value stored in authHeader: "Bearer eyJhbGciOiJIUzI1..."
  const token = authHeader && authHeader.split(' ')[1]; // authHeader &&: This is a safety check. If the authorization header is missing, it stops there so the code doesn't crash. .split(' ')[1]: It takes "Bearer eyJhb..." and turns it into an array: ["Bearer", "eyJhb..."]. We take index [1]. Returns: Just the encrypted string: "eyJhb...".

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET); // decrypts the token using your secret key. checks if token has expired or become invalid.
    
    // Add user info to request object
    req.user = decoded; // Example stored in decoded: { "userId": 507, "iat": 16123456, "exp": 16123999 }. req.user = decoded: We attach that user data directly to the Request object. Why? So that the next function in your code knows exactly which user is making the request (e.g., req.user.userId).
    
    // Continue to next middleware/route handler
    next(); // This "opens the door" and lets the request continue to the actual route handler e.g /api/protected
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' }); // user isnt allowed in.
  }
};

module.exports = authenticateToken;