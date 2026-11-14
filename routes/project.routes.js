const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');

// POST /api/projects - Save/update design project (requires logged in user)
router.post('/', projectController.saveProject);

// GET /api/projects - Get all projects for logged in user (?email=...)
router.get('/', projectController.getProjectsByUser);

// Admin: Get all projects across all users
router.get('/admin/all', projectController.getAllProjectsAdmin);
router.get('/all', projectController.getAllProjectsAdmin);

// GET /api/projects/:id - Load specific project
router.get('/:id', projectController.getProjectById);

// DELETE /api/projects/:id - Delete project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
