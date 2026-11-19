const pool = require('../db');

// Ensure cad_support_tickets table exists
const initSupportTable = () => {
  const createSql = `
    CREATE TABLE IF NOT EXISTS cad_support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      rating INT DEFAULT 5,
      category VARCHAR(100) DEFAULT 'General Feedback',
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      ip_address VARCHAR(100),
      device_info VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_support_user (user_email),
      INDEX idx_support_status (status),
      INDEX idx_support_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  pool.query(createSql, (err) => {
    if (err) {
      console.warn('[CAD-BE] Warning creating cad_support_tickets table:', err.message);
    } else {
      console.log('[CAD-BE] Table cad_support_tickets ready.');
    }
  });
};
initSupportTable();

// 1. Submit Support Message / Feedback (POST /api/support or POST /api/support/ticket)
exports.createTicket = (req, res) => {
  try {
    const {
      user_email,
      user_name,
      rating,
      category,
      message,
      device_info
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Support message is required'
      });
    }

    const email = (user_email && user_email.trim()) || 'guest@avcad.com';
    const name = (user_name && user_name.trim()) || 'Guest User';
    const cat = category || 'General Feedback';
    const starRating = Math.max(1, Math.min(5, Number(rating) || 5));
    const ip = req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
    const device = device_info || 'Web CAD Application';

    const insertSql = `
      INSERT INTO cad_support_tickets 
      (user_email, user_name, rating, category, message, status, ip_address, device_info, created_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NOW())
    `;

    pool.query(
      insertSql,
      [email, name, starRating, cat, message.trim(), String(ip), device],
      (err, result) => {
        if (err) {
          console.error('[CAD-BE] Error inserting support ticket:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error saving support message',
            error: err.message
          });
        }

        const ticketId = result.insertId;
        console.log(`[CAD-BE] Support ticket #${ticketId} created by ${email} (${cat}, ${starRating} stars)`);

        // Auto-insert notification for user in cad_notifications
        const notifSql = `
          INSERT INTO cad_notifications 
          (EmailId, Title, Message, PageType, IsRead, CreatedAt)
          VALUES (?, ?, ?, 'support', 0, NOW())
        `;
        pool.query(
          notifSql,
          [
            email,
            `Support Ticket #${ticketId} Submitted`,
            `Thank you for reaching out! We received your "${cat}" inquiry with ${starRating}-star feedback.`
          ],
          (notifErr) => {
            if (notifErr) {
              console.warn('[CAD-BE] Error inserting ticket submit notification:', notifErr.message);
            }
          }
        );

        return res.status(201).json({
          success: true,
          status: true,
          message: 'Support inquiry submitted successfully',
          ticketId,
          data: {
            id: ticketId,
            user_email: email,
            user_name: name,
            rating: starRating,
            category: cat,
            message: message.trim(),
            status: 'open',
            created_at: new Date().toISOString()
          }
        });
      }
    );
  } catch (err) {
    console.error('[CAD-BE] Support controller exception:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error processing support message',
      error: err.message
    });
  }
};

// 2. Get All Support Tickets for Admin with search, filter, and pagination
exports.getAllTickets = (req, res) => {
  const { search, rating, category, status, page, limit } = req.query;
  let baseWhere = ' WHERE 1=1';
  const params = [];

  if (rating && rating !== 'all') {
    baseWhere += ' AND rating = ?';
    params.push(parseInt(rating));
  }

  if (category && category !== 'all') {
    baseWhere += ' AND category = ?';
    params.push(category);
  }

  if (status && status !== 'all') {
    baseWhere += ' AND status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const s = `%${search.trim().toLowerCase()}%`;
    baseWhere += ' AND (LOWER(user_email) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(message) LIKE ?)';
    params.push(s, s, s);
  }

  if (page) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(200, parseInt(limit) || 25));
    const offset = (p - 1) * l;

    const countSql = `
      SELECT 
        COUNT(*) AS total,
        AVG(rating) AS avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star_count,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count
      FROM cad_support_tickets
      ${baseWhere}
    `;
    pool.query(countSql, params, (err, countResult) => {
      if (err) {
        console.error('[CAD-BE] Error counting support tickets:', err);
        return res.status(500).json({ success: false, message: 'Database error counting tickets', error: err.message });
      }
      const agg = (countResult && countResult[0]) || {};
      const total = Number(agg.total) || 0;
      const stats = {
        total,
        avgRating: agg.avg_rating !== null && agg.avg_rating !== undefined ? Number(agg.avg_rating).toFixed(1) : '5.0',
        fiveStarCount: Number(agg.five_star_count) || 0,
        openCount: Number(agg.open_count) || 0
      };

      const dataSql = `
        SELECT id, user_email, user_name, rating, category, message, status, ip_address, device_info, created_at
        FROM cad_support_tickets
        ${baseWhere}
        ORDER BY created_at DESC
        LIMIT ?, ?
      `;

      pool.query(dataSql, [...params, offset, l], (err2, rows) => {
        if (err2) {
          console.error('[CAD-BE] Error fetching support tickets page:', err2);
          return res.status(500).json({ success: false, message: 'Database error fetching tickets', error: err2.message });
        }
        return res.json({
          success: true,
          status: true,
          total,
          stats,
          page: p,
          limit: l,
          totalPages: Math.ceil(total / l),
          count: rows.length,
          tickets: rows
        });
      });
    });
  } else {
    const maxLimit = parseInt(limit) || 200;
    const selectSql = `
      SELECT id, user_email, user_name, rating, category, message, status, ip_address, device_info, created_at
      FROM cad_support_tickets
      ${baseWhere}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    pool.query(selectSql, [...params, maxLimit], (err, rows) => {
      if (err) {
        console.error('[CAD-BE] Error fetching support tickets:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error fetching support tickets',
          error: err.message
        });
      }

      return res.json({
        success: true,
        status: true,
        count: rows.length,
        tickets: rows
      });
    });
  }
};

// 3. Update Ticket Status (PUT /api/support/:id/status or PUT /api/support/:id)
exports.updateTicketStatus = (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  // 1. Fetch ticket to get user email and details
  const getTicketSql = `SELECT id, user_email, user_name, category, message, rating, status FROM cad_support_tickets WHERE id = ? LIMIT 1`;
  pool.query(getTicketSql, [id], (getErr, rows) => {
    if (getErr) {
      console.error('[CAD-BE] Error fetching ticket before status update:', getErr);
      return res.status(500).json({ success: false, message: 'Database error fetching ticket', error: getErr.message });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: `Ticket #${id} not found` });
    }

    const ticket = rows[0];

    // 2. Update status
    const updateSql = `UPDATE cad_support_tickets SET status = ? WHERE id = ?`;
    pool.query(updateSql, [status, id], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Failed to update ticket status', error: err.message });
      }

      const isResolved = String(status).toLowerCase() === 'resolved';
      if (isResolved && ticket.user_email) {
        // Send notification to the user
        const notifTitle = `Support Ticket #${ticket.id} Resolved`;
        const extraNote = note ? ` Admin Note: ${note}` : '';
        const notifMsg = `Your support inquiry regarding "${ticket.category || 'General Support'}" has been marked as resolved by the administrator.${extraNote} Thank you for your feedback!`;

        const notifSql = `
          INSERT INTO cad_notifications (EmailId, Title, Message, PageType, IsRead, CreatedAt)
          VALUES (?, ?, ?, 'support', 0, NOW())
        `;
        pool.query(notifSql, [ticket.user_email, notifTitle, notifMsg], (notifErr) => {
          if (notifErr) {
            console.warn('[CAD-BE] Error inserting resolution notification for user:', notifErr.message);
          } else {
            console.log(`[CAD-BE] Resolution notification sent to ${ticket.user_email} for ticket #${ticket.id}`);
          }
        });
      }

      return res.json({
        success: true,
        message: `Ticket #${id} marked as ${status}${isResolved ? ' and notification sent to user' : ''}`,
        ticketId: ticket.id,
        userEmail: ticket.user_email,
        status: status,
        notificationSent: isResolved && !!ticket.user_email
      });
    });
  });
};

// 4. Delete Ticket (DELETE /api/support/:id)
exports.deleteTicket = (req, res) => {
  const { id } = req.params;
  const deleteSql = `DELETE FROM cad_support_tickets WHERE id = ?`;
  pool.query(deleteSql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete ticket', error: err.message });
    }
    return res.json({ success: true, message: `Ticket #${id} deleted successfully` });
  });
};
