const db = require('../configs/db');

const PROPERTY_FIELDS = `
  p.id, p.title, p.address, p.city, p.state, p.zipCode,
  p.price, p.bedrooms, p.bathrooms, p.sqft, p.status, p.description,
  p.agentId, p.createdAt, p.updatedAt,
  a.name AS agentName, a.email AS agentEmail
`;

exports.getAll = async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ${PROPERTY_FIELDS}
      FROM property p
      LEFT JOIN agent a ON p.agentId = a.id
      ORDER BY p.createdAt DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ${PROPERTY_FIELDS} FROM property p LEFT JOIN agent a ON p.agentId = a.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Property not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status, description, agentId } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO property (title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status, description, agentId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status || 'available', description, agentId]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status, description, agentId } = req.body;
  try {
    const [result] = await db.query(
      `UPDATE property SET title=?, address=?, city=?, state=?, zipCode=?, price=?, bedrooms=?, bathrooms=?, sqft=?, status=?, description=?, agentId=? WHERE id=?`,
      [title, address, city, state, zipCode, price, bedrooms, bathrooms, sqft, status, description, agentId, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Property not found' });
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM property WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Property not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (_req, res) => {
  try {
    const [statusCounts] = await db.query(
      'SELECT status, COUNT(*) AS count FROM property GROUP BY status'
    );
    const [avgPrice] = await db.query(
      'SELECT AVG(price) AS avgPrice, MIN(price) AS minPrice, MAX(price) AS maxPrice FROM property'
    );
    const [byCity] = await db.query(
      'SELECT city, COUNT(*) AS count FROM property GROUP BY city ORDER BY count DESC'
    );
    res.json({ statusCounts, pricing: avgPrice[0], byCity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
