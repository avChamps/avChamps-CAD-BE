const express = require('express');
const router = express.Router();
const queryController = require('../controllers/query.controller');

// POST /run-query or POST /api/run-query
router.post('/', queryController.runQuery);

module.exports = router;
