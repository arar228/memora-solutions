import { Router } from 'express';
import {
  createUser, findUserByEmail, verifyPassword, signToken, publicUser, authRequired,
} from '../auth.js';

const r = Router();

// POST /api/auth/register
r.post('/register', (req, res) => {
  const { name, email, password, consent } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (!consent) return res.status(400).json({ error: 'consent required' });
  if (findUserByEmail(email)) return res.status(409).json({ error: 'email already registered' });
  const user = createUser({ name, email, password, consent: true, role: 'client' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login
r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password || '', user.pass_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

// GET /api/auth/me
r.get('/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default r;
