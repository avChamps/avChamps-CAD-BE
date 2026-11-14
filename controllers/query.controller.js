const pool = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'Avchamps';

exports.runQuery = (req, res) => {
  const authHeader = req.headers.authorization || req.headers.token || req.headers['x-access-token'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing Authorization header (Format: Bearer <token>)'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

  // Validate JWT Token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token',
      error: err.message
    });
  }

  const query = req.body.query || req.body.sql;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Bad Request: "query" field is required in the request body.',
      examplePayload: {
        query: 'SELECT * FROM cad_projects LIMIT 10;'
      }
    });
  }

  const trimmedQuery = query.trim();
  const startTime = Date.now();

  pool.query(trimmedQuery, (err, results, fields) => {
    const executionTimeMs = Date.now() - startTime;

    if (err) {
      console.error('[CAD-BE] run-query execution error:', err.message);
      return res.status(400).json({
        success: false,
        message: 'SQL execution failed',
        error: err.message,
        sqlState: err.sqlState,
        errno: err.errno,
        code: err.code,
        query: trimmedQuery,
        executionTimeMs
      });
    }

    const isSelect = Array.isArray(results);

    return res.status(200).json({
      success: true,
      message: 'Query executed successfully',
      query: trimmedQuery,
      executionTimeMs,
      rowCount: isSelect ? results.length : undefined,
      affectedRows: !isSelect ? results.affectedRows : undefined,
      insertId: !isSelect ? results.insertId : undefined,
      data: results
    });
  });
};
