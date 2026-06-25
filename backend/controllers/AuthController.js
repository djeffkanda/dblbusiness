const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../configs/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_EXPIRY = '7d';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO user (name, email, passwordHash) VALUES (?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: 'user' };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM user WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, email, role FROM user WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
