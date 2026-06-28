const express = require('express');
const { registerUser, loginUser, createToken, buildAuthCookie, clearAuthCookie, getUserFromRequest } = require('./authService');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user } = await registerUser({ name, email, password });
    const token = createToken(user);
    res.setHeader('Set-Cookie', buildAuthCookie(token));
    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === 'USER_EXISTS') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === 'Name, email, and password are required.') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Unable to register user due to a server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user } = await loginUser({ email, password });
    const token = createToken(user);
    res.setHeader('Set-Cookie', buildAuthCookie(token));
    res.json({ user, token });
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ message: error.message });
    }
    if (error.message === 'Email and password are required.') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Unable to login due to a server error.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Fetch user error:', error);
    res.status(500).json({ message: 'Unable to fetch user.' });
  }
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', clearAuthCookie());
  res.json({ message: 'Logged out.' });
});

module.exports = router;
