-- Migration: Add status column to cad_projects for distinguishing saved works vs drafts
ALTER TABLE `cad_projects` ADD COLUMN `status` VARCHAR(20) DEFAULT 'saved' AFTER `total_price`;
