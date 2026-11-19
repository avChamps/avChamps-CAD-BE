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

    const ip = req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
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
    const { email, type, search, page, limit } = req.query;
    let baseWhere = ' WHERE 1=1';
    const params = [];

    if (email) {
      baseWhere += ' AND user_email LIKE ?';
      params.push(`%${email.trim()}%`);
    }

    if (type && type !== 'all') {
      baseWhere += ' AND download_type = ?';
      params.push(type);
    }

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      baseWhere += ' AND (LOWER(user_email) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(project_name) LIKE ? OR LOWER(file_name) LIKE ?)';
      params.push(s, s, s, s);
    }

    if (page) {
      const p = Math.max(1, parseInt(page) || 1);
      const l = Math.max(1, Math.min(200, parseInt(limit) || 25));
      const offset = (p - 1) * l;

      const countSql = 'SELECT COUNT(*) AS total FROM cad_download_logs' + baseWhere;
      pool.query(countSql, params, (err, countResult) => {
        if (err) {
          console.error('[CAD-BE] Error counting download logs:', err);
          return res.status(500).json({ success: false, message: 'Database error counting logs', error: err.message });
        }
        const total = (countResult && countResult[0] && countResult[0].total) || 0;

        const dataSql = `SELECT * FROM cad_download_logs ${baseWhere} ORDER BY created_at DESC LIMIT ?, ?`;
        pool.query(dataSql, [...params, offset, l], (err2, rows) => {
          if (err2) {
            console.error('[CAD-BE] Error fetching download logs page:', err2);
            return res.status(500).json({ success: false, message: 'Database error fetching logs', error: err2.message });
          }
          return res.status(200).json({
            success: true,
            total,
            page: p,
            limit: l,
            totalPages: Math.ceil(total / l),
            count: rows.length,
            logs: rows
          });
        });
      });
    } else {
      const maxLimit = parseInt(limit) || 200;
      const sql = `SELECT * FROM cad_download_logs ${baseWhere} ORDER BY created_at DESC LIMIT ?`;
      pool.query(sql, [...params, maxLimit], (err, rows) => {
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
    }
  } catch (err) {
    console.error('[CAD-BE] getDownloadLogs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
