-- ========================================================
-- AV CAD SQL COMPILER: READY-TO-USE QUERIES FOR LEFT SIDEBAR
-- ========================================================

-- 1. Fetch all distinct categories with equipment count for sidebar badges:
SELECT 
  c.name AS category_name,
  c.icon,
  c.color,
  COUNT(e.id) AS equipment_count
FROM `cad_categories` c
LEFT JOIN `cad_equipment` e ON e.category = c.name AND e.is_active = 1
GROUP BY c.id, c.name, c.icon, c.color
ORDER BY c.display_order ASC;

-- 2. Fetch all active equipment for the left sidebar:
SELECT 
  id,
  mfg,
  model,
  name,
  category,
  sub_category,
  price,
  rack_units,
  power_watts,
  power_type,
  pins
FROM `cad_equipment`
WHERE is_active = 1
ORDER BY category ASC, mfg ASC, model ASC;

-- 3. Filter equipment by Category:
SELECT * 
FROM `cad_equipment`
WHERE is_active = 1 AND category = 'Displays & Visual Systems';

-- 4. Search equipment by Model, Manufacturer, or Keyword (dynamic search):
SELECT * 
FROM `cad_equipment`
WHERE is_active = 1 
  AND (
    LOWER(model) LIKE '%qsys%' 
    OR LOWER(mfg) LIKE '%qsys%' 
    OR LOWER(name) LIKE '%camera%'
    OR LOWER(category) LIKE '%camera%'
  );

-- 5. Insert a single new custom component into the library:
INSERT INTO `cad_equipment` 
(`id`, `mfg`, `model`, `name`, `category`, `sub_category`, `price`, `rack_units`, `power_watts`, `power_type`, `pins`)
VALUES
(
  'custom-display-75',
  'Samsung',
  'QM75C',
  '75" 4K UHD Standalone Commercial Display',
  'Displays & Visual Systems',
  'LCD Display',
  1650.00,
  0,
  135,
  'AC',
  '[{"id":"p_hdmi1","name":"HDMI 1 In","type":"IN","protocol":"HDMI"},{"id":"p_hdmi2","name":"HDMI 2 In","type":"IN","protocol":"HDMI"},{"id":"p_lan","name":"RJ45 Control","type":"IN","protocol":"RJ45"},{"id":"p_pwr","name":"AC Power","type":"POWER","protocol":"POWER"}]'
);

-- 6. Update equipment price:
UPDATE `cad_equipment` 
SET price = 1799.00 
WHERE id = 'custom-display-75';

-- 7. Soft-delete an equipment item:
UPDATE `cad_equipment` 
SET is_active = 0 
WHERE id = 'custom-display-75';
