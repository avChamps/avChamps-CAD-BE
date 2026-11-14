const pool = require('../db');

exports.saveProject = (req, res) => {
  const {
    id,
    user_email,
    user_id,
    user_name,
    project_name,
    project_data,
    nodes_count,
    wires_count,
    total_price,
    status
  } = req.body;

  if (!user_email) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. User must be logged in to save project.'
    });
  }

  const dataString = typeof project_data === 'string' ? project_data : JSON.stringify(project_data || {});
  const projectStatus = status === 'draft' ? 'draft' : 'saved';
  const defaultTitle = projectStatus === 'draft' ? 'Draft Project' : 'AV Design Project';
  const projTitle = (project_name || defaultTitle).trim();

  console.log(`[CAD-BE] saveProject called | id: ${id || '(none)'} | email: ${user_email} | status: ${projectStatus}`);

  if (id) {
    // Check if existing project exists
    const checkSql = 'SELECT id, project_name FROM `cad_projects` WHERE `id` = ? LIMIT 1';
    pool.query(checkSql, [id], (checkErr, checkRows) => {
      if (checkErr) {
        console.error('[CAD-BE] Error checking project existence:', checkErr);
      }

      if (!checkErr && checkRows && checkRows.length > 0) {
        // Project exists: perform explicit UPDATE to overwrite and modify existing record
        const updateSql = `
          UPDATE \`cad_projects\` SET
            \`project_name\` = ?,
            \`nodes_count\` = ?,
            \`wires_count\` = ?,
            \`total_price\` = ?,
            \`status\` = ?,
            \`project_data\` = ?,
            \`updated_at\` = CURRENT_TIMESTAMP
          WHERE \`id\` = ?
        `;
        pool.query(
          updateSql,
          [
            projTitle,
            nodes_count || 0,
            wires_count || 0,
            total_price || 0.00,
            projectStatus,
            dataString,
            id
          ],
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error('[CAD-BE] Error updating project:', updateErr);
              return res.status(500).json({
                success: false,
                message: 'Failed to update existing project',
                error: updateErr.message
              });
            }

            console.log(`[CAD-BE] Project successfully UPDATED: ${id} (${projTitle})`);

            // Record notification for user
            const notifTitle = projectStatus === 'draft' ? `Draft Updated: ${projTitle}` : `Project Saved: ${projTitle}`;
            const notifMsg = `Saved with ${nodes_count || 0} equipment devices and ${wires_count || 0} wire connections.`;
            const notifSql = 'INSERT INTO cad_notifications (EmailId, Title, Message, PageType, IsRead, CreatedAt) VALUES (?, ?, ?, ?, 0, NOW())';
            pool.query(notifSql, [user_email.trim(), notifTitle, notifMsg, projectStatus === 'draft' ? 'info' : 'event'], (nErr) => {
              if (nErr) console.warn('[CAD-BE] Could not record project notification:', nErr.message);
            });

            return res.status(200).json({
              success: true,
              message: projectStatus === 'draft' ? 'Draft updated successfully.' : 'Project design updated successfully.',
              projectId: id,
              projectName: projTitle,
              status: projectStatus,
              isUpdate: true
            });
          }
        );
        return;
      }

      // If id was supplied but record not in DB yet, insert with that id
      doInsert(id);
    });
  } else {
    // Brand new project: generate unique ID and insert
    const newProjectId = 'proj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    doInsert(newProjectId);
  }

  function doInsert(projectIdToUse) {
    const insertSql = `
      INSERT INTO \`cad_projects\` 
      (\`id\`, \`user_id\`, \`user_email\`, \`user_name\`, \`project_name\`, \`nodes_count\`, \`wires_count\`, \`total_price\`, \`status\`, \`project_data\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    pool.query(
      insertSql,
      [
        projectIdToUse,
        user_id || null,
        user_email,
        user_name || null,
        projTitle,
        nodes_count || 0,
        wires_count || 0,
        total_price || 0.00,
        projectStatus,
        dataString
      ],
      (err, result) => {
        if (err) {
          console.error('[CAD-BE] Error inserting project:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to save project to database',
            error: err.message
          });
        }

        console.log(`[CAD-BE] Project successfully CREATED: ${projectIdToUse} (${projTitle})`);

        // Record notification for user
        const notifTitle = projectStatus === 'draft' ? `Draft Saved: ${projTitle}` : `New Project Saved: ${projTitle}`;
        const notifMsg = `Saved with ${nodes_count || 0} equipment devices and ${wires_count || 0} wire connections.`;
        const notifSql = 'INSERT INTO cad_notifications (EmailId, Title, Message, PageType, IsRead, CreatedAt) VALUES (?, ?, ?, ?, 0, NOW())';
        pool.query(notifSql, [user_email.trim(), notifTitle, notifMsg, projectStatus === 'draft' ? 'info' : 'event'], (nErr) => {
          if (nErr) console.warn('[CAD-BE] Could not record project notification:', nErr.message);
        });

        return res.status(200).json({
          success: true,
          message: projectStatus === 'draft' ? 'Draft saved successfully.' : 'Project design saved successfully to database.',
          projectId: projectIdToUse,
          projectName: projTitle,
          status: projectStatus,
          isUpdate: false
        });
      }
    );
  }
};

exports.getProjectsByUser = (req, res) => {
  const user_email = req.query.email || req.body.email;
  const statusFilter = req.query.status; // optional: 'saved' or 'draft'

  if (!user_email) {
    return res.status(400).json({ success: false, message: 'User email is required' });
  }

  let sql = `
    SELECT id, project_name, nodes_count, wires_count, total_price, status, created_at, updated_at
    FROM \`cad_projects\`
    WHERE \`user_email\` = ?
  `;
  const params = [user_email];

  if (statusFilter) {
    sql += ` AND \`status\` = ?`;
    params.push(statusFilter);
  }

  sql += ` ORDER BY \`updated_at\` DESC`;

  pool.query(sql, params, (err, rows) => {
    if (err) {
      console.error('Error fetching user projects:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch projects', error: err.message });
    }

    res.json({ success: true, count: rows.length, projects: rows });
  });
};

exports.deleteProject = (req, res) => {
  const { id } = req.params;
  const user_email = req.query.email || req.body.email;

  let sql = 'DELETE FROM `cad_projects` WHERE `id` = ?';
  const params = [id];

  if (user_email) {
    sql += ' AND `user_email` = ?';
    params.push(user_email);
  }

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error deleting project:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete project', error: err.message });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully.',
      affectedRows: result.affectedRows
    });
  });
};

exports.getProjectById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM `cad_projects` WHERE `id` = ? LIMIT 1';

  pool.query(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to load project', error: err.message });
    }
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const row = rows[0];
    let parsedData = {};
    try {
      parsedData = JSON.parse(row.project_data);
    } catch (e) {}

    res.json({
      success: true,
      project: {
        id: row.id,
        projectName: row.project_name,
        userEmail: row.user_email,
        userName: row.user_name,
        nodesCount: row.nodes_count,
        wiresCount: row.wires_count,
        totalPrice: row.total_price,
        status: row.status || 'saved',
        data: parsedData,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  });
};

// Admin: Get all projects across all users
exports.getAllProjectsAdmin = (req, res) => {
  const statusFilter = req.query.status;
  let sql = `
    SELECT id, user_id, user_email, user_name, project_name, nodes_count, wires_count, total_price, status, created_at, updated_at
    FROM \`cad_projects\`
  `;
  const params = [];
  if (statusFilter && statusFilter !== 'all') {
    sql += ` WHERE \`status\` = ?`;
    params.push(statusFilter);
  }
  sql += ` ORDER BY \`updated_at\` DESC`;

  pool.query(sql, params, (err, rows) => {
    if (err) {
      console.error('[CAD-BE] Error fetching all projects for admin:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch all projects', error: err.message });
    }
    return res.status(200).json({
      success: true,
      count: rows.length,
      projects: rows
    });
  });
};
