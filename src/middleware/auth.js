import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error('Missing JWT_SECRET env var');
  process.exit(1);
}

export function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
