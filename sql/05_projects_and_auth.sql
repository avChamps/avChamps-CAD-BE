-- ========================================================
-- AV CAD & AVCHAMPS COMMON USER MANAGEMENT & PROJECTS
-- ========================================================

-- 1. Table for Saving CAD Designs per User in avcad database:
CREATE TABLE IF NOT EXISTS `cad_projects` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `user_id` INT NULL,
  `user_email` VARCHAR(150) NOT NULL,
  `user_name` VARCHAR(150) NULL,
  `project_name` VARCHAR(200) DEFAULT 'AV Design',
  `nodes_count` INT DEFAULT 0,
  `wires_count` INT DEFAULT 0,
  `total_price` DECIMAL(10, 2) DEFAULT 0.00,
  `project_data` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_email` (`user_email`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Query to fetch AVChamps user profiles (Common User Management):
-- Users are shared between AVChamps and AVCad via avchamps.ProfileTable
SELECT Id, EmailId, FullName, FirstName, LastName, JwtToken, created_at 
FROM `avchamps`.`ProfileTable` 
ORDER BY Id DESC 
LIMIT 20;

-- 3. Query to fetch all saved designs for a user:
SELECT id, project_name, nodes_count, wires_count, total_price, created_at, updated_at
FROM `cad_projects`
WHERE user_email = 'adbharat2020@gmail.com'
ORDER BY updated_at DESC;

-- 4. Query to delete a saved design:
DELETE FROM `cad_projects`
WHERE id = 'proj_example_123' AND user_email = 'adbharat2020@gmail.com';
