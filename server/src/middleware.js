const jwt = require('jsonwebtoken');
const { HttpError, unauthorized } = require('./errors');

function requireAuth(secret) {
  return (req, _res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized());
    try {
      const payload = jwt.verify(token, secret);
      req.user = { id: payload.sub };
      next();
    } catch {
      next(unauthorized('Invalid or expired token'));
    }
  };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // body-parser errors (malformed JSON, payload too large)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Route not found' });
}

module.exports = { requireAuth, errorHandler, notFoundHandler };
