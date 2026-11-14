const pool = require('../db');

function formatEquipment(row) {
  let pins = [];
  if (row.pins) {
    try {
      pins = typeof row.pins === 'string' ? JSON.parse(row.pins) : row.pins;
    } catch (e) {
      console.warn('Failed to parse pins for', row.id, e.message);
      pins = [];
    }
  }

  return {
    id: String(row.id || ''),
    mfg: row.mfg || '',
    model: row.model || '',
    name: row.name || '',
    category: row.category || '',
    subCategory: row.sub_category || undefined,
    price: parseFloat(row.price) || 0,
    rackUnits: row.rack_units !== undefined && row.rack_units !== null ? Number(row.rack_units) : 0,
    powerWatts: row.power_watts !== undefined && row.power_watts !== null ? Number(row.power_watts) : 0,
    powerType: row.power_type || 'AC',
    pins: Array.isArray(pins) ? pins : []
  };
}

const EquipmentModel = {
  // Get all active equipment with optional search & category filter
  getAll: (filters = {}) => {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM `cad_equipment` WHERE `is_active` = 1';
      const params = [];

      if (filters.category && filters.category !== 'ALL') {
        query += ' AND `category` = ?';
        params.push(filters.category);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query += ' AND (LOWER(`model`) LIKE ? OR LOWER(`mfg`) LIKE ? OR LOWER(`name`) LIKE ? OR LOWER(`category`) LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      query += ' ORDER BY `category` ASC, `mfg` ASC, `model` ASC';

      pool.query(query, params, (err, rows) => {
        if (err) return reject(err);
        const formatted = rows.map(formatEquipment);
        resolve(formatted);
      });
    });
  },

  // Get single equipment by ID
  getById: (id) => {
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM `cad_equipment` WHERE `id` = ? AND `is_active` = 1 LIMIT 1';
      pool.query(query, [id], (err, rows) => {
        if (err) return reject(err);
        if (rows.length === 0) return resolve(null);
        resolve(formatEquipment(rows[0]));
      });
    });
  },

  // Create or Upsert equipment item
  create: (item) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO \`cad_equipment\`
        (\`id\`, \`mfg\`, \`model\`, \`name\`, \`category\`, \`sub_category\`, \`price\`, \`rack_units\`, \`power_watts\`, \`power_type\`, \`pins\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        \`mfg\`=VALUES(\`mfg\`), \`model\`=VALUES(\`model\`), \`name\`=VALUES(\`name\`), \`category\`=VALUES(\`category\`),
        \`sub_category\`=VALUES(\`sub_category\`), \`price\`=VALUES(\`price\`), \`rack_units\`=VALUES(\`rack_units\`),
        \`power_watts\`=VALUES(\`power_watts\`), \`power_type\`=VALUES(\`power_type\`), \`pins\`=VALUES(\`pins\`)
      `;

      const pinsJson = JSON.stringify(item.pins || []);
      const params = [
        item.id,
        item.mfg || '',
        item.model || '',
        item.name || '',
        item.category || '',
        item.subCategory || null,
        Number(item.price) || 0,
        Number(item.rackUnits) || 0,
        Number(item.powerWatts) || 0,
        item.powerType || 'AC',
        pinsJson
      ];

      pool.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve({ id: item.id, ...item });
      });
    });
  },

  // Update equipment item
  update: (id, updates) => {
    return new Promise((resolve, reject) => {
      const allowed = ['mfg', 'model', 'name', 'category', 'subCategory', 'price', 'rackUnits', 'powerWatts', 'powerType', 'pins'];
      const setClauses = [];
      const params = [];

      for (const key of Object.keys(updates)) {
        if (!allowed.includes(key)) continue;

        if (key === 'subCategory') {
          setClauses.push('`sub_category` = ?');
          params.push(updates[key]);
        } else if (key === 'rackUnits') {
          setClauses.push('`rack_units` = ?');
          params.push(updates[key]);
        } else if (key === 'powerWatts') {
          setClauses.push('`power_watts` = ?');
          params.push(updates[key]);
        } else if (key === 'powerType') {
          setClauses.push('`power_type` = ?');
          params.push(updates[key]);
        } else if (key === 'pins') {
          setClauses.push('`pins` = ?');
          params.push(JSON.stringify(updates[key]));
        } else {
          setClauses.push(`\`${key}\` = ?`);
          params.push(updates[key]);
        }
      }

      if (setClauses.length === 0) return resolve({ updated: false });

      params.push(id);
      const sql = `UPDATE \`cad_equipment\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`;

      pool.query(sql, params, (err, result) => {
        if (err) return reject(err);
        resolve({ updated: result.affectedRows > 0 });
      });
    });
  },

  // Soft delete
  delete: (id) => {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE `cad_equipment` SET `is_active` = 0 WHERE `id` = ?';
      pool.query(sql, [id], (err, result) => {
        if (err) return reject(err);
        resolve({ deleted: result.affectedRows > 0 });
      });
    });
  }
};

module.exports = EquipmentModel;
