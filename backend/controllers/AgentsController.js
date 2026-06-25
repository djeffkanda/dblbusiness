const db = require('../configs/db');

exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM agent ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM agent WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Agent not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, email, phone, licenseNumber } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO agent (name, email, phone, licenseNumber) VALUES (?, ?, ?, ?)',
      [name, email, phone, licenseNumber]
    );
    res.status(201).json({ id: result.insertId, name, email, phone, licenseNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { name, email, phone, licenseNumber } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE agent SET name = ?, email = ?, phone = ?, licenseNumber = ? WHERE id = ?',
      [name, email, phone, licenseNumber, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Agent not found' });
    res.json({ id: Number(req.params.id), name, email, phone, licenseNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM agent WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Agent not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
