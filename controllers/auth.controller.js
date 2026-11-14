const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'Avchamps';
const AVCHAMPS_BASE = process.env.AVCHAMPS_API || 'https://avchamps.com/nodejs';

// Helper to forward requests to AVChamps production service (for mail/OTP/SSO flows)
async function proxyToAvchamps(endpoint, req, res) {
  try {
    const url = `${AVCHAMPS_BASE}${endpoint}`;
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (req.headers.authorization) {
      options.headers['Authorization'] = req.headers.authorization;
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(url, options);
    const contentType = upstreamRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await upstreamRes.json();
      return res.status(upstreamRes.status).json(data);
    } else {
      const text = await upstreamRes.text();
      return res.status(upstreamRes.status).send(text);
    }
  } catch (err) {
    console.error(`Proxy error for ${endpoint}:`, err.message);
    return res.status(502).json({
      status: false,
      success: false,
      message: `Authentication service unavailable: ${err.message}`
    });
  }
}

// 1. Login Handler (Direct DB verification with AVChamps ProfileTable + fallback)
exports.login = async (req, res) => {
  try {
    const EmailId = req.body.EmailId || req.body.email;
    const Password = req.body.Password || req.body.password;

    if (!EmailId || !Password) {
      return res.status(400).json({
        status: false,
        success: false,
        message: 'EmailId and Password are required.'
      });
    }

    const sql = 'SELECT * FROM avchamps.ProfileTable WHERE EmailId = ?';
    pool.query(sql, [EmailId.trim()], async (err, results) => {
      if (err) {
        console.error('Database error in auth login, falling back to upstream:', err);
        return proxyToAvchamps('/login', req, res);
      }

      if (!results || results.length === 0) {
        return res.status(401).json({
          status: false,
          success: false,
          message: 'Invalid email or password.'
        });
      }

      const user = results[0];
      let passwordMatch = false;

      // Handle bcrypt hashed password or plain text match fallback
      if (user.Password) {
        if (user.Password.startsWith('$2')) {
          passwordMatch = await bcrypt.compare(Password, user.Password);
        } else {
          passwordMatch = (Password === user.Password);
        }
      }

      if (!passwordMatch) {
        return res.status(401).json({
          status: false,
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Generate JWT Token identical to AVChamps standard
      const token = jwt.sign(
        { id: user.Id, email: user.EmailId, name: user.FullName },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update JwtToken in avchamps.ProfileTable
      const updateSql = 'UPDATE avchamps.ProfileTable SET JwtToken = ? WHERE EmailId = ?';
      pool.query(updateSql, [token, user.EmailId], (uErr) => {
        if (uErr) console.warn('Warning: Could not update token in ProfileTable:', uErr.message);
      });

      return res.status(200).json({
        status: true,
        success: true,
        message: 'Login successful.',
        token: token,
        fullName: user.FullName || user.FirstName || 'AVChamps User',
        emailId: user.EmailId,
        id: user.Id
      });
    });
  } catch (error) {
    console.error('Unexpected error in auth login:', error);
    res.status(500).json({
      status: false,
      success: false,
      message: 'Internal server error during login',
      error: error.message
    });
  }
};

// 2. Create Account (Triggers OTP email via AVChamps SMTP)
exports.createAccount = (req, res) => {
  return proxyToAvchamps('/createAccount', req, res);
};

// 3. Verify OTP & Register (Registers user in ProfileTable)
exports.verifyOtpAndRegister = (req, res) => {
  return proxyToAvchamps('/verifyOtpAndRegister', req, res);
};

// 4. Forgot Password (Generates & emails recovery OTP)
exports.forgotPassword = (req, res) => {
  return proxyToAvchamps('/forgotPassword', req, res);
};

// 5. Verify Forgot OTP
exports.verifyForgotOtp = (req, res) => {
  return proxyToAvchamps('/verifyForgotOtp', req, res);
};

// 6. Reset Password (Saves new hashed password)
exports.resetPassword = (req, res) => {
  return proxyToAvchamps('/resetPassword', req, res);
};

// 7. Get Session (Used after SSO callback)
exports.getSession = (req, res) => {
  return proxyToAvchamps('/getSession', req, res);
};

// 8. Verify Token
exports.verifyToken = (req, res) => {
  const token = req.body.token || req.query.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(400).json({
      status: false,
      success: false,
      message: 'Token is required.'
    });
  }

  const sql = 'SELECT Id, EmailId, FirstName, FullName, JwtToken FROM avchamps.ProfileTable WHERE JwtToken = ?';
  pool.query(sql, [token.trim()], (err, results) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(500).json({ status: false, message: 'Database error' });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({
        status: false,
        success: false,
        message: 'Invalid token or session expired.'
      });
    }

    const user = results[0];
    return res.status(200).json({
      status: true,
      success: true,
      message: 'Session valid.',
      user: {
        id: user.Id,
        emailId: user.EmailId,
        fullName: user.FullName || user.FirstName || user.EmailId
      }
    });
  });
};

// 9. Logout
exports.logout = (req, res) => {
  const token = req.body.token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    pool.query('UPDATE avchamps.ProfileTable SET JwtToken = NULL WHERE JwtToken = ?', [token.trim()], () => {});
  }
  return res.json({ status: true, success: true, message: 'Logged out successfully.' });
};

// 10. Get Profile (GET /getProfile?emailId=...&JwtToken=...)
exports.getProfile = async (req, res) => {
  try {
    const emailId = req.query.emailId || req.query.EmailId;
    const token = req.query.JwtToken || req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!emailId) {
      return res.status(400).json({
        status: false,
        message: 'emailId query parameter is required.'
      });
    }

    const sql = 'SELECT * FROM avchamps.ProfileTable WHERE EmailId = ? LIMIT 1';
    pool.query(sql, [emailId.trim()], (err, results) => {
      if (err) {
        console.error('Database error in getProfile, proxying to avchamps:', err.message);
        return proxyToAvchamps(`/getProfile?emailId=${encodeURIComponent(emailId)}&JwtToken=${encodeURIComponent(token || '')}`, req, res);
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          status: false,
          message: 'User profile not found.'
        });
      }

      const profile = { ...results[0] };
      delete profile.Password;

      return res.status(200).json({
        status: true,
        data: [profile]
      });
    });
  } catch (err) {
    console.error('getProfile error:', err);
    return proxyToAvchamps(`/getProfile?emailId=${encodeURIComponent(req.query.emailId || '')}`, req, res);
  }
};

// Auto-create cad_notifications table if needed
const initNotificationTable = () => {
  const createSql = `
    CREATE TABLE IF NOT EXISTS cad_notifications (
      NotificationID INT AUTO_INCREMENT PRIMARY KEY,
      EmailId VARCHAR(255) NOT NULL,
      Title VARCHAR(255) NOT NULL,
      Message TEXT NOT NULL,
      PageType VARCHAR(50) DEFAULT 'info',
      IsRead TINYINT(1) DEFAULT 0,
      CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email (EmailId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  pool.query(createSql, (err) => {
    if (err) console.warn('Warning creating cad_notifications table:', err.message);
  });
};
initNotificationTable();

// 11. Get Notifications (GET /getNotifications?emailId=...)
exports.getNotifications = async (req, res) => {
  try {
    const emailId = req.query.emailId || req.query.EmailId || req.body?.emailId || 'avc@av.com';
    const token = req.query.JwtToken || req.query.token || req.headers.authorization?.replace('Bearer ', '');

    const sql = 'SELECT * FROM cad_notifications WHERE EmailId = ? ORDER BY CreatedAt DESC LIMIT 50';
    pool.query(sql, [emailId.trim()], (err, results) => {
      if (err) {
        console.warn('cad_notifications query failed, falling back to proxy:', err.message);
        return proxyToAvchamps(`/getNotifications?emailId=${encodeURIComponent(emailId)}`, req, res);
      }

      if (results && results.length > 0) {
        const unreadCount = results.filter(r => r.IsRead === 0 || r.IsRead === false).length;
        return res.status(200).json({
          status: true,
          success: true,
          unreadCount,
          notifications: results
        });
      }

      // If empty for this user, seed default welcome notifications
      const seedSql = `
        INSERT INTO cad_notifications (EmailId, Title, Message, PageType, IsRead, CreatedAt)
        VALUES 
          (?, 'Welcome to AV Architect CAD Pro', 'Your professional engineering workspace is ready. Design, export high-res CAD drawings and Excel schedules.', 'login', 0, NOW()),
          (?, 'CAD Engine Ready', 'High-resolution CAD drawing generator with title block and equipment schematics is active.', 'event', 1, DATE_SUB(NOW(), INTERVAL 2 HOUR))
      `;
      pool.query(seedSql, [emailId.trim(), emailId.trim()], (seedErr) => {
        pool.query(sql, [emailId.trim()], (reErr, reResults) => {
          const list = reResults || [];
          const unread = list.filter(r => r.IsRead === 0 || r.IsRead === false).length;
          return res.status(200).json({
            status: true,
            success: true,
            unreadCount: unread || 1,
            notifications: list.length > 0 ? list : [
              {
                NotificationID: 1,
                EmailId: emailId,
                Title: 'Welcome to AV Architect CAD Pro',
                Message: 'Your professional engineering workspace is ready. Design, export high-res CAD drawings and Excel schedules.',
                PageType: 'login',
                IsRead: 0,
                CreatedAt: new Date().toISOString()
              }
            ]
          });
        });
      });
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return proxyToAvchamps(`/getNotifications?emailId=${encodeURIComponent(req.query.emailId || '')}`, req, res);
  }
};

// 12. Mark As Read (POST /markAsRead)
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.body?.notificationId || req.body?.id || req.query.notificationId;
    const emailId = req.body?.emailId || req.query.emailId;
    const markAll = req.body?.markAll || notificationId === 'all';

    if (markAll) {
      const sql = emailId 
        ? 'UPDATE cad_notifications SET IsRead = 1 WHERE EmailId = ?'
        : 'UPDATE cad_notifications SET IsRead = 1';
      const params = emailId ? [emailId.trim()] : [];
      pool.query(sql, params, (err) => {
        if (err) console.warn('Error marking all notifications as read:', err.message);
        return res.status(200).json({
          status: true,
          success: true,
          message: 'All notifications marked as read'
        });
      });
      return;
    }

    if (!notificationId) {
      return res.status(400).json({
        status: false,
        success: false,
        message: 'notificationId is required'
      });
    }

    const sql = 'UPDATE cad_notifications SET IsRead = 1 WHERE NotificationID = ?';
    pool.query(sql, [notificationId], (err) => {
      if (err) {
        console.warn('Error marking notification as read:', err.message);
        return proxyToAvchamps('/markAsRead', req, res);
      }
      return res.status(200).json({
        status: true,
        success: true,
        message: 'Notification marked as read'
      });
    });
  } catch (error) {
    console.error('markAsRead error:', error);
    return proxyToAvchamps('/markAsRead', req, res);
  }
};

// 13. Dismiss Notification (POST /dismissNotification)
exports.dismissNotification = async (req, res) => {
  try {
    const notificationId = req.body?.notificationId || req.body?.id || req.query.notificationId;
    const emailId = req.body?.emailId || req.query.emailId;
    const clearAll = req.body?.clearAll || notificationId === 'all';

    if (clearAll) {
      const sql = emailId 
        ? 'DELETE FROM cad_notifications WHERE EmailId = ?'
        : 'DELETE FROM cad_notifications';
      const params = emailId ? [emailId.trim()] : [];
      pool.query(sql, params, (err) => {
        if (err) console.warn('Error clearing notifications:', err.message);
        return res.status(200).json({
          status: true,
          success: true,
          message: 'All notifications cleared'
        });
      });
      return;
    }

    if (!notificationId) {
      return res.status(400).json({
        status: false,
        success: false,
        message: 'notificationId is required'
      });
    }

    const sql = 'DELETE FROM cad_notifications WHERE NotificationID = ?';
    pool.query(sql, [notificationId], (err) => {
      if (err) {
        console.warn('Error dismissing notification:', err.message);
        return proxyToAvchamps('/dismissNotification', req, res);
      }
      return res.status(200).json({
        status: true,
        success: true,
        message: 'Notification dismissed'
      });
    });
  } catch (error) {
    console.error('dismissNotification error:', error);
    return proxyToAvchamps('/dismissNotification', req, res);
  }
};

// 14. Add Notification (POST /addNotification or POST /api/notifications)
exports.addNotification = (req, res) => {
  try {
    const emailId = req.body?.emailId || req.body?.EmailId || req.query.emailId || 'avc@av.com';
    const title = req.body?.title || req.body?.Title || 'Notification';
    const message = req.body?.message || req.body?.Message || '';
    const pageType = req.body?.pageType || req.body?.PageType || 'info';

    const sql = 'INSERT INTO cad_notifications (EmailId, Title, Message, PageType, IsRead, CreatedAt) VALUES (?, ?, ?, ?, 0, NOW())';
    pool.query(sql, [emailId.trim(), title, message, pageType], (err, result) => {
      if (err) {
        console.error('Error adding notification:', err);
        return res.status(500).json({ status: false, message: 'Database error' });
      }
      return res.status(200).json({
        status: true,
        success: true,
        message: 'Notification created successfully',
        notificationId: result.insertId
      });
    });
  } catch (err) {
    console.error('addNotification error:', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};
