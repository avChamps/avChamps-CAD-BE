const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// GET /api/categories - List all categories
router.get('/', categoryController.getCategories);

// POST /api/categories - Create/add new category
router.post('/', categoryController.createCategory);

// DELETE /api/categories/:name - Delete category
router.delete('/:name', categoryController.deleteCategory);

module.exports = router;
