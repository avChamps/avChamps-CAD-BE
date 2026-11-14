const pool = require('../db');

const DEFAULT_CATEGORIES = [
  'Networking & AV over IP',
  'Displays & Visual Systems',
  'Video Conferencing & UC',
  'Video Switching & Distribution',
  'Audio & DSP Systems',
  'Control & Automation',
  'Sources & Compute',
  'Power & Infrastructure'
];

// Ensure cad_categories table exists and seed defaults if empty
const initCategoriesTable = () => {
  const createSql = `
    CREATE TABLE IF NOT EXISTS \`cad_categories\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(150) NOT NULL UNIQUE,
      \`is_active\` TINYINT(1) DEFAULT 1,
      \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  pool.query(createSql, (err) => {
    if (err) {
      console.warn('[CAD-BE] Warning creating cad_categories table:', err.message);
      return;
    }
    // Check if table is empty, seed defaults
    pool.query('SELECT COUNT(*) AS count FROM `cad_categories`', (cntErr, rows) => {
      if (!cntErr && rows && rows[0].count === 0) {
        const seedSql = 'INSERT IGNORE INTO `cad_categories` (`name`) VALUES ?';
        const values = DEFAULT_CATEGORIES.map(c => [c]);
        pool.query(seedSql, [values], (seedErr) => {
          if (!seedErr) console.log('[CAD-BE] Seeded default categories into cad_categories');
        });
      }
    });
  });
};
initCategoriesTable();

// GET /api/categories
exports.getCategories = (req, res) => {
  const sql = 'SELECT * FROM `cad_categories` WHERE `is_active` = 1 ORDER BY `name` ASC';
  pool.query(sql, (err, rows) => {
    if (err) {
      console.warn('[CAD-BE] Error querying cad_categories, falling back to DISTINCT category from cad_equipment:', err.message);
      pool.query('SELECT DISTINCT `category` AS name FROM `cad_equipment` WHERE `category` IS NOT NULL AND `category` != ""', (err2, rows2) => {
        if (err2) {
          return res.json({
            success: true,
            count: DEFAULT_CATEGORIES.length,
            categories: DEFAULT_CATEGORIES,
            data: DEFAULT_CATEGORIES.map((c, i) => ({ id: i + 1, name: c }))
          });
        }
        const cats = Array.from(new Set([...DEFAULT_CATEGORIES, ...rows2.map(r => r.name)]));
        return res.json({
          success: true,
          count: cats.length,
          categories: cats,
          data: cats.map((c, i) => ({ id: i + 1, name: c }))
        });
      });
      return;
    }

    if (!rows || rows.length === 0) {
      return res.json({
        success: true,
        count: DEFAULT_CATEGORIES.length,
        categories: DEFAULT_CATEGORIES,
        data: DEFAULT_CATEGORIES.map((c, i) => ({ id: i + 1, name: c }))
      });
    }

    const catNames = rows.map(r => r.name);
    return res.json({
      success: true,
      count: catNames.length,
      categories: catNames,
      data: rows
    });
  });
};

// POST /api/categories
exports.createCategory = (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Category name is required' });
  }
  const cleanName = name.trim();
  const sql = 'INSERT INTO `cad_categories` (`name`) VALUES (?) ON DUPLICATE KEY UPDATE `is_active` = 1';
  pool.query(sql, [cleanName], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to create category', error: err.message });
    }
    return res.status(201).json({
      success: true,
      message: `Category "${cleanName}" created successfully`,
      category: cleanName
    });
  });
};

// DELETE /api/categories/:name
exports.deleteCategory = (req, res) => {
  const name = req.params.name;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
  const sql = 'DELETE FROM `cad_categories` WHERE `name` = ?';
  pool.query(sql, [name], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    return res.json({ success: true, message: `Category "${name}" deleted` });
  });
};
