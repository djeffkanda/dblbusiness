require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', tier: 'application', service: 'bldbusiness API' });
});

app.use('/api', routes);

module.exports = app;
