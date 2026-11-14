require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const equipmentRoutes = require('./routes/equipment.routes');
const categoryRoutes = require('./routes/category.routes');
const authRoutes = require('./routes/auth.routes');
const authController = require('./controllers/auth.controller');
const downloadController = require('./controllers/download.controller');
const projectRoutes = require('./routes/project.routes');
const queryRoutes = require('./routes/query.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check & DB connection status
app.get('/api/health', (req, res) => {
  pool.query('SELECT 1 + 1 AS solution', (err, results) => {
    if (err) {
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: err.message
      });
    }

    pool.query('SELECT COUNT(*) AS total_equipment FROM `cad_equipment` WHERE `is_active` = 1', (e1, r1) => {
      pool.query('SELECT COUNT(*) AS total_categories FROM `cad_categories`', (e2, r2) => {
        res.json({
          status: 'ok',
          message: 'AV CAD Backend API is running',
          timestamp: new Date().toISOString(),
          database: {
            connected: true,
            totalEquipment: r1 && r1[0] ? r1[0].total_equipment : 0,
            totalCategories: r2 && r2[0] ? r2[0].total_categories : 0
          }
        });
      });
    });
  });
});

// API Routes
app.use('/api/equipment', equipmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/run-query', queryRoutes);
app.use('/run-query', queryRoutes);
app.use('/api/run-quey', queryRoutes);
app.use('/run-quey', queryRoutes);

// Admin & Download Tracking
app.post('/api/downloads/track', downloadController.trackDownload);
app.post('/api/admin/track-download', downloadController.trackDownload);
app.post('/track-download', downloadController.trackDownload);
app.get('/api/downloads/logs', downloadController.getDownloadLogs);
app.get('/api/admin/downloads', downloadController.getDownloadLogs);
app.get('/api/admin/projects', (req, res) => {
  const projectController = require('./controllers/project.controller');
  return projectController.getAllProjectsAdmin(req, res);
});

// AVChamps Compatibility Routes
app.use('/login', authRoutes);
app.use('/getJWTToken', authRoutes);
app.use('/createAccount', authRoutes);
app.use('/verifyOtpAndRegister', authRoutes);
app.use('/forgotPassword', authRoutes);
app.use('/verifyForgotOtp', authRoutes);
app.use('/resetPassword', authRoutes);
app.use('/getSession', authRoutes);
app.get('/getProfile', authController.getProfile);
app.get('/getProfiles', authController.getProfile);
app.use('/getProfile', authRoutes);
app.use('/getProfiles', authRoutes);

// AVChamps Notifications Routes
app.get('/getNotifications', authController.getNotifications);
app.post('/addNotification', authController.addNotification);
app.post('/markAsRead', authController.markAsRead);
app.post('/dismissNotification', authController.dismissNotification);
app.get('/api/notifications', authController.getNotifications);
app.get('/api/getNotifications', authController.getNotifications);
app.post('/api/notifications', authController.addNotification);
app.post('/api/addNotification', authController.addNotification);
app.post('/api/markAsRead', authController.markAsRead);
app.post('/api/dismissNotification', authController.dismissNotification);

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to AV Architect CAD Backend API',
    endpoints: {
      health: 'GET /api/health',
      equipment: 'GET /api/equipment (supports ?category=X&search=Y)',
      equipmentById: 'GET /api/equipment/:id',
      categories: 'GET /api/categories',
      sqlFolder: './sql'
    }
  });
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` AV CAD Backend Server running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` Equipment API: http://localhost:${PORT}/api/equipment`);
  console.log(` Categories API: http://localhost:${PORT}/api/categories`);
  console.log(` SQL Folder: /sql for compiler queries`);
  console.log(`===============================================`);
});

module.exports = app;
