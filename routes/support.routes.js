const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');

// POST /api/support -> Submit new ticket
router.post('/', supportController.createTicket);
router.post('/ticket', supportController.createTicket);
router.post('/feedback', supportController.createTicket);

// GET /api/support -> List tickets for admin/audit
router.get('/', supportController.getAllTickets);
router.get('/all', supportController.getAllTickets);
router.get('/admin', supportController.getAllTickets);

// PUT /api/support/:id/status & PUT /api/support/:id -> Update status
router.put('/:id', supportController.updateTicketStatus);
router.put('/:id/status', supportController.updateTicketStatus);

// DELETE /api/support/:id -> Delete ticket
router.delete('/:id', supportController.deleteTicket);

module.exports = router;
