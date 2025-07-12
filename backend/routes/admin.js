const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(requireAdmin);

// Get admin dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE NOT is_banned) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_banned) as banned_users,
        (SELECT COUNT(*) FROM skills WHERE is_approved) as approved_skills,
        (SELECT COUNT(*) FROM skills WHERE NOT is_approved) as pending_skills,
        (SELECT COUNT(*) FROM swap_requests WHERE status = 'pending') as pending_swaps,
        (SELECT COUNT(*) FROM swap_requests WHERE status = 'completed') as completed_swaps,
        (SELECT COUNT(*) FROM swap_feedback) as total_feedback,
        (SELECT AVG(rating)::numeric(3,2) FROM swap_feedback) as avg_platform_rating
    `);

    const recentActivity = await pool.query(`
      SELECT 'user_registration' as type, name as description, created_at as timestamp
      FROM users 
      WHERE created_at > NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'skill_request' as type, name as description, created_at as timestamp
      FROM skills 
      WHERE created_at > NOW() - INTERVAL '7 days' AND NOT is_approved
      UNION ALL
      SELECT 'swap_request' as type, CONCAT('Swap request #', id) as description, created_at as timestamp
      FROM swap_requests 
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    res.json({
      statistics: stats.rows[0],
      recent_activity: recentActivity.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users with pagination and filtering
router.get('/users', async (req, res) => {
  try {
    const { search, status = 'all', limit = 20, offset = 0 } = req.query;
    
    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (search) {
      whereClause = `WHERE (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status !== 'all') {
      const statusClause = status === 'banned' ? 'is_banned = true' : 'is_banned = false';
      whereClause = whereClause ? `${whereClause} AND ${statusClause}` : `WHERE ${statusClause}`;
    }

    const query = `
      SELECT id, email, name, location, profile_photo, is_public, is_banned, is_admin, created_at,
             (SELECT COUNT(*) FROM swap_requests WHERE requester_id = users.id OR provider_id = users.id) as total_swaps,
             (SELECT AVG(rating)::numeric(3,2) FROM swap_feedback WHERE reviewee_id = users.id) as avg_rating
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/unban user
router.put('/users/:id/ban', [
  body('is_banned').isBoolean(),
  body('reason').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.params.id;
    const { is_banned, reason } = req.body;

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name, email, is_banned FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Prevent banning other admins
    if (is_banned) {
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [userId]
      );
      
      if (adminCheck.rows[0].is_admin) {
        return res.status(400).json({ error: 'Cannot ban an admin user' });
      }
    }

    // Update user ban status
    await pool.query(
      'UPDATE users SET is_banned = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [is_banned, userId]
    );

    res.json({
      message: `User ${is_banned ? 'banned' : 'unbanned'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_banned: is_banned
      }
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending skills for approval
router.get('/skills/pending', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT s.id, s.name, s.description, s.created_at,
             sc.name as category_name,
             COUNT(us.id) as request_count
      FROM skills s
      LEFT JOIN skill_categories sc ON s.category_id = sc.id
      LEFT JOIN user_skills us ON s.id = us.skill_id
      WHERE s.is_approved = false
      GROUP BY s.id, s.name, s.description, s.created_at, sc.name
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    res.json({ pending_skills: result.rows });
  } catch (error) {
    console.error('Get pending skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject skill
router.put('/skills/:id/approve', [
  body('is_approved').isBoolean(),
  body('reason').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const skillId = req.params.id;
    const { is_approved, reason } = req.body;

    // Check if skill exists
    const skillResult = await pool.query(
      'SELECT id, name, is_approved FROM skills WHERE id = $1',
      [skillId]
    );

    if (skillResult.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const skill = skillResult.rows[0];

    // Update skill approval status
    await pool.query(
      'UPDATE skills SET is_approved = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [is_approved, skillId]
    );

    res.json({
      message: `Skill ${is_approved ? 'approved' : 'rejected'} successfully`,
      skill: {
        id: skill.id,
        name: skill.name,
        is_approved: is_approved
      }
    });
  } catch (error) {
    console.error('Approve skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all swap requests with filtering
router.get('/swaps', async (req, res) => {
  try {
    const { status = 'all', limit = 20, offset = 0 } = req.query;

    let whereClause = '';
    const params = [];
    let paramCount = 1;

    if (status !== 'all') {
      whereClause = 'WHERE sr.status = $1';
      params.push(status);
      paramCount++;
    }

    const query = `
      SELECT sr.id, sr.status, sr.created_at, sr.updated_at,
             ru.name as requester_name, ru.email as requester_email,
             pu.name as provider_name, pu.email as provider_email,
             rs.name as requester_skill, ps.name as provider_skill
      FROM swap_requests sr
      JOIN users ru ON sr.requester_id = ru.id
      JOIN users pu ON sr.provider_id = pu.id
      JOIN skills rs ON sr.requester_skill_id = rs.id
      JOIN skills ps ON sr.provider_skill_id = ps.id
      ${whereClause}
      ORDER BY sr.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({ swap_requests: result.rows });
  } catch (error) {
    console.error('Get swaps error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin message
router.post('/messages', [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('content').trim().isLength({ min: 1, max: 5000 }),
  body('message_type').isIn(['info', 'warning', 'announcement', 'maintenance']),
  body('expires_at').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, content, message_type, expires_at } = req.body;
    const adminId = req.user.id;

    const result = await pool.query(
      'INSERT INTO admin_messages (admin_id, title, content, message_type, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
      [adminId, title, content, message_type, expires_at || null]
    );

    res.status(201).json({
      message: 'Admin message created successfully',
      message_id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Create admin message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin messages
router.get('/messages', async (req, res) => {
  try {
    const { active_only = 'false', limit = 20, offset = 0 } = req.query;

    let whereClause = '';
    if (active_only === 'true') {
      whereClause = 'WHERE am.is_active = true AND (am.expires_at IS NULL OR am.expires_at > CURRENT_TIMESTAMP)';
    }

    const query = `
      SELECT am.id, am.title, am.content, am.message_type, am.is_active,
             am.created_at, am.expires_at, u.name as admin_name
      FROM admin_messages am
      JOIN users u ON am.admin_id = u.id
      ${whereClause}
      ORDER BY am.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get admin messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin message
router.put('/messages/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('content').optional().trim().isLength({ min: 1, max: 5000 }),
  body('message_type').optional().isIn(['info', 'warning', 'announcement', 'maintenance']),
  body('is_active').optional().isBoolean(),
  body('expires_at').optional().isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const messageId = req.params.id;
    const { title, content, message_type, is_active, expires_at } = req.body;

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (message_type !== undefined) {
      updateFields.push(`message_type = $${paramCount}`);
      values.push(message_type);
      paramCount++;
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (expires_at !== undefined) {
      updateFields.push(`expires_at = $${paramCount}`);
      values.push(expires_at);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(messageId);

    const query = `
      UPDATE admin_messages 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, title, content, message_type, is_active, expires_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      message: 'Admin message updated successfully',
      updated_message: result.rows[0]
    });
  } catch (error) {
    console.error('Update admin message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete admin message
router.delete('/messages/:id', async (req, res) => {
  try {
    const messageId = req.params.id;

    const result = await pool.query(
      'DELETE FROM admin_messages WHERE id = $1 RETURNING id',
      [messageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Admin message deleted successfully' });
  } catch (error) {
    console.error('Delete admin message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate and download reports
router.get('/reports', async (req, res) => {
  try {
    const { type = 'users', format = 'json' } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'users':
        data = await pool.query(`
          SELECT u.id, u.name, u.email, u.location, u.is_public, u.is_banned, u.created_at,
                 COUNT(DISTINCT sr1.id) as requests_sent,
                 COUNT(DISTINCT sr2.id) as requests_received,
                 COUNT(DISTINCT CASE WHEN sr3.status = 'completed' THEN sr3.id END) as completed_swaps,
                 AVG(sf.rating)::numeric(3,2) as avg_rating
          FROM users u
          LEFT JOIN swap_requests sr1 ON u.id = sr1.requester_id
          LEFT JOIN swap_requests sr2 ON u.id = sr2.provider_id
          LEFT JOIN swap_requests sr3 ON (u.id = sr3.requester_id OR u.id = sr3.provider_id)
          LEFT JOIN swap_feedback sf ON u.id = sf.reviewee_id
          GROUP BY u.id, u.name, u.email, u.location, u.is_public, u.is_banned, u.created_at
          ORDER BY u.created_at DESC
        `);
        filename = 'users_report';
        break;

      case 'swaps':
        data = await pool.query(`
          SELECT sr.id, sr.status, sr.created_at, sr.updated_at, sr.completed_at,
                 ru.name as requester_name, ru.email as requester_email,
                 pu.name as provider_name, pu.email as provider_email,
                 rs.name as requester_skill, ps.name as provider_skill,
                 sf.rating, sf.feedback
          FROM swap_requests sr
          JOIN users ru ON sr.requester_id = ru.id
          JOIN users pu ON sr.provider_id = pu.id
          JOIN skills rs ON sr.requester_skill_id = rs.id
          JOIN skills ps ON sr.provider_skill_id = ps.id
          LEFT JOIN swap_feedback sf ON sr.id = sf.swap_request_id
          ORDER BY sr.created_at DESC
        `);
        filename = 'swaps_report';
        break;

      case 'feedback':
        data = await pool.query(`
          SELECT sf.id, sf.rating, sf.feedback, sf.is_anonymous, sf.created_at,
                 ru.name as reviewer_name, ru.email as reviewer_email,
                 reu.name as reviewee_name, reu.email as reviewee_email,
                 rs.name as requester_skill, ps.name as provider_skill
          FROM swap_feedback sf
          JOIN users ru ON sf.reviewer_id = ru.id
          JOIN users reu ON sf.reviewee_id = reu.id
          JOIN swap_requests sr ON sf.swap_request_id = sr.id
          JOIN skills rs ON sr.requester_skill_id = rs.id
          JOIN skills ps ON sr.provider_skill_id = ps.id
          ORDER BY sf.created_at DESC
        `);
        filename = 'feedback_report';
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    if (format === 'json') {
      res.json({
        report_type: type,
        generated_at: new Date().toISOString(),
        data: data.rows
      });
    } else {
      return res.status(400).json({ error: 'Only JSON format is supported' });
    }
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;