# AV CAD SQL Queries & Database Setup

This folder contains all SQL files for setting up and managing the dynamic left-side equipment library:

1. **`01_create_tables.sql`**:
   - Creates `cad_categories`, `cad_sub_categories`, and `cad_equipment` tables in the database.
   - Run this first in your SQL compiler.

2. **`02_insert_categories.sql`**:
   - Inserts the AV equipment categories (Displays, Audio, Cameras, Control, Switches, etc.).
   - Run this in your SQL compiler to seed standard categories.

3. **`03_insert_equipment.sql`**:
   - Inserts 46 complete AV equipment models with pin configurations (HDMI, RJ45, Audio, Power, etc.) as JSON.
   - Run this in your SQL compiler to populate the left sidebar library.

4. **`04_sidebar_queries.sql`**:
   - Pre-written queries for searching, filtering, adding custom equipment, and updating prices.

### How to run in your SQL Compiler:
- Open your SQL tool (MySQL Workbench, phpMyAdmin, DBeaver, or terminal).
- Select the `avchamps` database.
- Open and execute the files in order: `01_create_tables.sql`, `02_insert_categories.sql`, then `03_insert_equipment.sql`.
- You can also paste or customize queries in `04_sidebar_queries.sql` to manage items.
