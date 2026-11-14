const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Login
router.post('/login', authController.login);

// Token Verification & Session
router.post('/getJWTToken', authController.verifyToken);
router.post('/verify', authController.verifyToken);
router.post('/getSession', authController.getSession);

// Create Account Flow
router.post('/createAccount', authController.createAccount);
router.post('/verifyOtpAndRegister', authController.verifyOtpAndRegister);

// Forgot Password Flow
router.post('/forgotPassword', authController.forgotPassword);
router.post('/verifyForgotOtp', authController.verifyForgotOtp);
router.post('/resetPassword', authController.resetPassword);

// Logout
router.post('/logout', authController.logout);

// Profile
router.get('/', authController.getProfile);
router.get('/getProfile', authController.getProfile);

// Notifications
router.get('/getNotifications', authController.getNotifications);
router.post('/addNotification', authController.addNotification);
router.post('/markAsRead', authController.markAsRead);
router.post('/dismissNotification', authController.dismissNotification);

module.exports = router;
