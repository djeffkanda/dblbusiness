const express = require('express');
const AgentsController = require('../controllers/AgentsController');
const PropertiesController = require('../controllers/PropertiesController');
const AuthController = require('../controllers/AuthController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', requireAuth, AuthController.me);

router.get('/agents', AgentsController.getAll);
router.get('/agents/:id', AgentsController.getById);
router.post('/agents', requireAuth, AgentsController.create);
router.put('/agents/:id', requireAuth, AgentsController.update);
router.delete('/agents/:id', requireAuth, AgentsController.remove);

router.get('/properties/stats', PropertiesController.getStats);
router.get('/properties', PropertiesController.getAll);
router.get('/properties/:id', PropertiesController.getById);
router.post('/properties', requireAuth, PropertiesController.create);
router.put('/properties/:id', requireAuth, PropertiesController.update);
router.delete('/properties/:id', requireAuth, PropertiesController.remove);

module.exports = router;
