-- ========================================================
-- INSERT AV CAD CATEGORIES & SUB-CATEGORIES
-- ========================================================
-- Execute this query in your SQL compiler to populate categories.

INSERT INTO `cad_categories` (`name`, `icon`, `color`, `display_order`) VALUES
('Displays & Visual Systems', 'fa-tv', 'indigo', 1),
('Audio Equipment', 'fa-microphone-lines', 'amber', 2),
('Cameras & Video Capture', 'fa-video', 'emerald', 3),
('Video Processing & Distribution', 'fa-sitemap', 'purple', 4),
('Control Systems', 'fa-tablet-screen-button', 'rose', 5),
('Networking & AV over IP', 'fa-network-wired', 'blue', 6),
('Video Conferencing', 'fa-video-slash', 'cyan', 7),
('Power Management', 'fa-plug', 'red', 8),
('Mounting & Rack Systems', 'fa-server', 'slate', 9),
('Cables & Connectivity', 'fa-ethernet', 'teal', 10),
('Streaming & Recording', 'fa-clapperboard', 'fuchsia', 11),
('Specialised AV Systems', 'fa-wand-magic-sparkles', 'violet', 12)
ON DUPLICATE KEY UPDATE `icon`=VALUES(`icon`), `color`=VALUES(`color`), `display_order`=VALUES(`display_order`);

-- Sub-categories
INSERT INTO `cad_sub_categories` (`category_name`, `name`, `display_order`) VALUES
('Displays & Visual Systems', 'LCD Display', 1),
('Displays & Visual Systems', 'LED Display', 2),
('Displays & Visual Systems', 'Interactive Display', 3),
('Displays & Visual Systems', 'Projector', 4),
('Audio Equipment', 'Loudspeaker', 1),
('Audio Equipment', 'Amplifier', 2),
('Audio Equipment', 'Audio DSP', 3),
('Audio Equipment', 'Ceiling Array', 4),
('Audio Equipment', 'Microphone', 5),
('Cameras & Video Capture', 'PTZ Camera', 1),
('Cameras & Video Capture', 'Fixed Camera', 2),
('Cameras & Video Capture', 'Video Bars', 3),
('Cameras & Video Capture', 'Video Display', 4),
('Video Processing & Distribution', 'Matrix Switcher', 1),
('Video Processing & Distribution', 'HDMI Switcher', 2),
('Video Processing & Distribution', 'AV Encoder / Decoder', 3),
('Control Systems', 'Control Processor', 1),
('Control Systems', 'Touch Panel', 2),
('Networking & AV over IP', 'Network Switch', 1);
