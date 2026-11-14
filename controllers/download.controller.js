const pool = require('../db');

// Ensure cad_download_logs table exists
const initDownloadLogsTable = () => {
  const createSql = `
    CREATE TABLE IF NOT EXISTS cad_download_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      project_name VARCHAR(255),
      project_id VARCHAR(100),
      download_type VARCHAR(50) NOT NULL,
      file_name VARCHAR(255),
      ip_address VARCHAR(100),
      device_info VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_email),
      INDEX idx_type (download_type),
      INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  pool.query(createSql, (err) => {
    if (err) console.warn('[CAD-BE] Warning creating cad_download_logs table:', err.message);
  });
};
initDownloadLogsTable();

// 1. Record Download Event (POST /api/downloads/track or POST /api/admin/track-download)
exports.trackDownload = (req, res) => {
  try {
    const {
      user_email,
      user_name,
      project_name,
      project_id,
      download_type,
      file_name,
      device_info
    } = req.body;

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const email = user_email || 'guest@avcad.com';
    const name = user_name || 'Guest User';
    const type = download_type || 'CAD Image';
    const proj = project_name || 'AV System Design';
    const file = file_name || 'Drawing.png';

    const sql = `
      INSERT INTO cad_download_logs 
      (user_email, user_name, project_name, project_id, download_type, file_name, ip_address, device_info, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    pool.query(sql, [email.trim(), name, proj, project_id || null, type, file, String(ip), device_info || 'Browser Web App'], (err, result) => {
      if (err) {
        console.error('[CAD-BE] Error recording download log:', err);
        return res.status(500).json({ success: false, message: 'Database error recording download', error: err.message });
      }

      console.log(`[CAD-BE] Download tracked: ${type} by ${email} (${file})`);
      return res.status(200).json({
        success: true,
        message: 'Download tracked successfully',
        logId: result.insertId
      });
    });
  } catch (err) {
    console.error('[CAD-BE] trackDownload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Fetch All Download Logs (GET /api/downloads/logs or GET /api/admin/downloads)
exports.getDownloadLogs = (req, res) => {
  try {
    const { email, type, limit = 200 } = req.query;
    let sql = 'SELECT * FROM cad_download_logs';
    const params = [];
    const conditions = [];

    if (email) {
      conditions.push('user_email LIKE ?');
      params.push(`%${email.trim()}%`);
    }
    if (type && type !== 'all') {
      conditions.push('download_type = ?');
      params.push(type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit) || 200);

    pool.query(sql, params, (err, rows) => {
      if (err) {
        console.error('[CAD-BE] Error fetching download logs:', err);
        return res.status(500).json({ success: false, message: 'Database error fetching logs', error: err.message });
      }

      return res.status(200).json({
        success: true,
        count: rows.length,
        logs: rows
      });
    });
  } catch (err) {
    console.error('[CAD-BE] getDownloadLogs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
