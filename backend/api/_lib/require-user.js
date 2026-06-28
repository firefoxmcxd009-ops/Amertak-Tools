const { getUserFromRequest } = require('./auth');

async function requireUser(req, res) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({
        message: 'Please login or register to use this tool.',
        loginRequired: true
      });
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth check failed:', error);
    res.status(500).json({ message: 'Authentication service is temporarily unavailable.' });
    return null;
  }
}

module.exports = { requireUser };
