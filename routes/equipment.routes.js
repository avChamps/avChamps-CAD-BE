const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');

// GET /api/equipment - list equipment (supports ?category=X&search=Y)
router.get('/', equipmentController.getEquipmentList);

// GET /api/equipment/:id - get single equipment
router.get('/:id', equipmentController.getEquipmentById);

// POST /api/equipment - create new equipment
router.post('/', equipmentController.createEquipment);

// PUT /api/equipment/:id - update equipment
router.put('/:id', equipmentController.updateEquipment);

// DELETE /api/equipment/:id - delete equipment
router.delete('/:id', equipmentController.deleteEquipment);

module.exports = router;
