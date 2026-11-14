const fs = require('fs');
const path = require('path');
const equipment = require('/home/disendra/Documents/Angular/CAD/av-cad/src/app/models/all-equipment.json');

let sql = '-- ========================================================\n';
sql += '-- INSERT CAD EQUIPMENT (LEFT SIDEBAR EQUIPMENT LIBRARY)\n';
sql += '-- ========================================================\n';
sql += '-- Execute this query in your SQL compiler to insert all equipment items.\n\n';

for (const item of equipment) {
  const id = item.id.replace(/'/g, "\\'");
  const mfg = (item.mfg || '').replace(/'/g, "\\'");
  const model = (item.model || '').replace(/'/g, "\\'");
  const name = (item.name || '').replace(/'/g, "\\'");
  const category = (item.category || '').replace(/'/g, "\\'");
  const subCategory = item.subCategory ? "'" + item.subCategory.replace(/'/g, "\\'") + "'" : 'NULL';
  const price = Number(item.price || 0).toFixed(2);
  const rackUnits = Number(item.rackUnits || 0);
  const powerWatts = Number(item.powerWatts || 0);
  const powerType = (item.powerType || 'AC').replace(/'/g, "\\'");
  const pinsJson = JSON.stringify(item.pins || []).replace(/'/g, "\\'");

  sql += 'INSERT INTO `cad_equipment` (`id`, `mfg`, `model`, `name`, `category`, `sub_category`, `price`, `rack_units`, `power_watts`, `power_type`, `pins`) VALUES\n';
  sql += "('" + id + "', '" + mfg + "', '" + model + "', '" + name + "', '" + category + "', " + subCategory + ", " + price + ", " + rackUnits + ", " + powerWatts + ", '" + powerType + "', '" + pinsJson + "')\n";
  sql += 'ON DUPLICATE KEY UPDATE `mfg`=VALUES(`mfg`), `model`=VALUES(`model`), `name`=VALUES(`name`), `category`=VALUES(`category`), `sub_category`=VALUES(`sub_category`), `price`=VALUES(`price`), `rack_units`=VALUES(`rack_units`), `power_watts`=VALUES(`power_watts`), `power_type`=VALUES(`power_type`), `pins`=VALUES(`pins`);\n\n';
}

fs.writeFileSync(path.join(__dirname, '../sql/03_insert_equipment.sql'), sql, 'utf8');
console.log('Successfully generated 03_insert_equipment.sql with ' + equipment.length + ' equipment items.');
