require('dotenv').config({ override: true });

const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', tier: 'application', service: 'bldbusiness API' });
});

app.use('/api', routes);

module.exports = app;
