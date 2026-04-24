# 🔐 JWT Secret & Authentication Guide

## What is JWT?

**JWT** stands for **JSON Web Token**. It's a secure way to pass information between the server and client.

Think of it like a **digital ID card** that proves "I am who I say I am."

### How JWT Works

1. **User logs in** with Team ID + Name + Password
2. **Backend verifies** credentials against database
3. **Backend creates a JWT token** - a signed token containing user info
4. **Frontend stores the token** (in memory or localStorage)
5. **Frontend sends the token** with every request to protected endpoints
6. **Backend verifies the token** before allowing access
7. **If token is invalid/expired**, user must login again

### Example JWT Structure

A JWT has 3 parts, separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1YmY3YzhiZjgwMDBhMDAwMjAwMDAwMDEiLCJ0ZWFtSWQiOiJUVC0yMDI2LTA wMDQyIiwicm9sZSI6ImN0byIsIm5hbWUiOiJBbGljZSIsImlhdCI6MTcxNzMzNjAwMH0.signature123
```

Breaking it down:
- **Part 1**: Header (algorithm used)
- **Part 2**: Payload (actual data - encoded but readable)
- **Part 3**: Signature (proof it hasn't been tampered with)

---

## What is JWT_SECRET?

**JWT_SECRET** is a secret key used to create and verify the signature of JWT tokens.

### Why It's Important

- It's the **only thing that can create valid signatures**
- If someone knows your JWT_SECRET, they can forge tokens
- It must be **kept secret** and never shared

### Analogy

JWT_SECRET is like the **unique pattern on your handwriting**:
- Only you can create that exact pattern
- Anyone can verify it's authentic if they see it
- But if someone steals your pattern, they can forge your signature

---

## Current JWT_SECRET in Your Project

### What You Have Now

```env
JWT_SECRET=cloud-tycoon-aws-learning-game-2026-super-secret-key-please-change-in-production-use-32-char-string
```

### How It's Used

Located in `backend/.env` file:
- Used to sign all JWT tokens created during login
- Used to verify tokens sent by the frontend
- Required for the app to work

---

## 🔒 Security Best Practices

### ✅ DO:
1. **Keep JWT_SECRET secret** - never commit to git
2. **Use a strong, long secret** (32+ characters)
3. **Change it for production** - use `openssl rand -hex 32` to generate
4. **Use HTTPS only** - never send JWT over plain HTTP
5. **Set reasonable expiration** (default: 7 days)
6. **Rotate secrets periodically** - change JWT_SECRET every 3-6 months

### ❌ DON'T:
1. **Commit JWT_SECRET to git** - use .env files instead
2. **Use simple words** - "password123" or "secret" are weak
3. **Share the secret** - even with team members
4. **Log the secret** - in error messages or console
5. **Hardcode the secret** - always use environment variables

---

## How to Generate a Strong JWT_SECRET

### Option 1: Using OpenSSL (Linux/Mac)

```bash
openssl rand -hex 32
```

Output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### Option 2: Using Python

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Option 3: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 4: Online (Not Recommended for Production)

- Go to https://randomkeygen.com/
- Copy "SHA-2 (512-bit Hex)" value

---

## Your Current Setup

### MongoDB Atlas Connection

You've configured:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

This means:
- **Database Provider**: MongoDB Atlas (Cloud)
- **Username**: jaswanthre9_db_user
- **Database**: cloud-tycoon
- **Security**: Credentials included in connection string

### JWT Secret for Development

Current: `cloud-tycoon-aws-learning-game-2026-super-secret-key-please-change-in-production-use-32-char-string`

This is **good for development**, but **MUST be changed for production**.

---

## Production Checklist

Before deploying to production, do this:

### 1. Generate New JWT_SECRET

```bash
openssl rand -hex 32
# Example output: f7a3e2c1b4d6h8j9k0l2m3n5o7p9q1r3s5t7u9v0w2x4y6z8a0
```

### 2. Update backend/.env

```env
# Change from development secret to production secret
JWT_SECRET=your-32-char-secret-here
```

### 3. For Heroku/Railway Deployment

Add the JWT_SECRET as an environment variable:

```bash
# Heroku
heroku config:set JWT_SECRET="your-new-secret-here"

# Or via Heroku Dashboard:
# Settings → Config Vars → Add JWT_SECRET
```

### 4. For Vercel (Frontend)

Add REACT_APP variables (these are safe to be public):

```bash
REACT_APP_API_URL=https://your-deployed-backend.herokuapp.com/api
REACT_APP_SOCKET_URL=https://your-deployed-backend.herokuapp.com
```

---

## Understanding the Flow

### Login Flow with JWT

```
1. User submits:
   {
     teamId: "TT-2026-0042",
     memberName: "Alice",
     role: "cto",
     password: "Password123!"
   }

2. Backend verifies:
   ✓ Team exists
   ✓ Member name matches
   ✓ Role matches
   ✓ Password is correct (bcrypt check)

3. Backend creates JWT:
   JWT = sign({
     userId: "user123",
     teamId: "TT-2026-0042",
     role: "cto",
     name: "Alice"
   }, JWT_SECRET)

4. Backend returns token to frontend:
   {
     token: "eyJhbGciOiJIUzI1NiIs...",
     teamId: "TT-2026-0042",
     role: "cto",
     memberName: "Alice"
   }

5. Frontend stores token:
   localStorage.setItem('token', token)
   // or in Zustand store

6. Frontend sends token with requests:
   GET /api/questions/1/cto
   Headers: {
     Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..."
   }

7. Backend verifies token:
   ✓ Signature is valid (using JWT_SECRET)
   ✓ Token is not expired
   ✓ Extract user info from token

8. Backend grants access:
   Returns questions for CTO role
```

---

## Password Hashing (bcryptjs)

### How Passwords Are Stored

Passwords are **hashed** using bcryptjs:

```javascript
// During registration:
const hashedPassword = await bcrypt.hash("Password123!", 10);
// Result: $2a$10$w9.KVA5s5GnXN6Y4h5Y6PO...

// Stored in database: $2a$10$w9.KVA5s5GnXN6Y4h5Y6PO...

// During login (verification):
const isValid = await bcrypt.compare("Password123!", hashedPassword);
// Returns: true or false
```

### Important Points

- **Passwords are hashed, not encrypted** - they can't be decoded back to plaintext
- **bcryptjs adds salt** - each password hash is unique even for same password
- **Comparison is done in-place** - the server never sees the plaintext password
- **Each login verification is slow by design** - prevents brute force attacks

---

## What Happens When JWT Expires

### Default Configuration

```env
JWT_EXPIRE=7d  # Token expires in 7 days
```

### After Expiration

1. Frontend sends request with expired token
2. Backend rejects the request
3. Frontend shows "Session expired"
4. User must login again to get new token

### Setting Expiration

```javascript
// Short expiration (more secure, but annoying for users)
JWT_EXPIRE=1h  // 1 hour

// Medium expiration (recommended)
JWT_EXPIRE=7d  // 7 days

// Long expiration (less secure, good for events)
JWT_EXPIRE=30d // 30 days
```

---

## Troubleshooting JWT Issues

### "Invalid Token" Error

**Cause**: JWT_SECRET changed or token is corrupted

**Solution**:
- Ensure JWT_SECRET is consistent
- Clear browser storage and login again
- Check that token is being sent correctly in headers

### "Token Expired" Error

**Cause**: User's JWT token is older than JWT_EXPIRE value

**Solution**:
- User must login again
- Or increase JWT_EXPIRE value

### Token Not Sent

**Cause**: Axios interceptor not working

**Check** `frontend/src/utils/api.js`:
```javascript
// Should include:
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Summary

| Concept | Explanation |
|---------|-------------|
| **JWT** | Secure token proving user identity |
| **JWT_SECRET** | Secret key to sign and verify JWTs |
| **bcryptjs** | Algorithm to hash passwords securely |
| **Token Expiration** | How long until user must login again |
| **Signature** | Proof the token hasn't been tampered with |
| **Payload** | User data inside the token (not encrypted) |

---

## What You Need to Know

### For Development (Right Now)
✅ Use the default JWT_SECRET  
✅ Passwords require: 8+ chars, uppercase, lowercase, number, special char  
✅ Tokens expire in 7 days  
✅ Passwords are hashed in database  

### For Production (Before Event Day)
✅ Generate new JWT_SECRET using `openssl rand -hex 32`  
✅ Update in Heroku/Railway config vars  
✅ Use HTTPS only  
✅ Keep JWT_SECRET secret  
✅ Set reasonable expiration time  

---

**That's it!** Your authentication is now secure with proper password validation, JWT tokens, and role-based access control. 🔐

