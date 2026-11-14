-- ========================================================
-- AV CAD DATABASE SCHEMA: TABLES FOR DYNAMIC LEFT SIDEBAR
-- ========================================================
-- Database: avchamps
-- Run this in your MySQL / SQL Compiler to create the required tables.

-- 1. Table for Categories
CREATE TABLE IF NOT EXISTS `cad_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(50) DEFAULT 'fa-box',
  `color` VARCHAR(50) DEFAULT 'blue',
  `badge_class` VARCHAR(150) NULL,
  `display_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table for Sub-categories (optional hierarchy)
CREATE TABLE IF NOT EXISTS `cad_sub_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(100) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `display_order` INT DEFAULT 0,
  INDEX `idx_cat_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table for Equipment Library Items (Left Side Section)
CREATE TABLE IF NOT EXISTS `cad_equipment` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `mfg` VARCHAR(100) NOT NULL COMMENT 'Manufacturer, e.g., Shure, Crestron, Q-SYS',
  `model` VARCHAR(150) NOT NULL COMMENT 'Model number, e.g., MXA920, NC-12x80',
  `name` VARCHAR(255) NOT NULL COMMENT 'Full name / description of equipment',
  `category` VARCHAR(100) NOT NULL COMMENT 'Category matching cad_categories',
  `sub_category` VARCHAR(100) NULL COMMENT 'Sub-category e.g., Ceiling Array, PTZ Camera',
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `rack_units` INT DEFAULT 0,
  `power_watts` FLOAT DEFAULT 0,
  `power_type` VARCHAR(50) DEFAULT 'AC' COMMENT 'Power type: AC, PoE, DC',
  `pins` JSON NULL COMMENT 'Array of pins/ports: [{id, name, type: IN|OUT|POWER, protocol: RJ45|HDMI|POWER|AUDIO|USB|RS232|SDI|DP}]',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category` (`category`),
  INDEX `idx_mfg` (`mfg`),
  INDEX `idx_model` (`model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
