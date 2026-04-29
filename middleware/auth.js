import jwt from 'jsonwebtoken';

/** Must match `JWT_SECRET` in `backend/.env` / `.env.example` so tokens work after clone + copy env. */
const JWT_SECRET =
  process.env.JWT_SECRET || 'change-this-to-a-long-random-string';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export { JWT_SECRET };
