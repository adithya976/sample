const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all skill categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description FROM skill_categories ORDER BY name'
    );
    res.json({ categories: result.rows });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all skills
router.get('/', async (req, res) => {
  try {
    const { category_id, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT s.id, s.name, s.description, s.category_id, 
             sc.name as category_name, s.is_approved
      FROM skills s
      LEFT JOIN skill_categories sc ON s.category_id = sc.id
      WHERE s.is_approved = true
    `;
    
    const params = [];
    let paramCount = 1;

    if (category_id) {
      query += ` AND s.category_id = $${paramCount}`;
      params.push(parseInt(category_id));
      paramCount++;
    }

    if (search) {
      query += ` AND s.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY s.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json({ skills: result.rows });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search skills by name
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await pool.query(
      `SELECT s.id, s.name, s.description, sc.name as category_name 
       FROM skills s 
       LEFT JOIN skill_categories sc ON s.category_id = sc.id 
       WHERE s.name ILIKE $1 AND s.is_approved = true 
       ORDER BY s.name LIMIT 20`,
      [`%${q}%`]
    );

    res.json({ skills: result.rows });
  } catch (error) {
    console.error('Search skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new skill (requires authentication)
router.post('/', authenticateToken, [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('category_id').isInt({ min: 1 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category_id } = req.body;

    // Check if skill already exists
    const existingSkill = await pool.query(
      'SELECT id FROM skills WHERE name ILIKE $1',
      [name]
    );

    if (existingSkill.rows.length > 0) {
      return res.status(400).json({ error: 'Skill already exists' });
    }

    // Check if category exists
    const categoryResult = await pool.query(
      'SELECT id FROM skill_categories WHERE id = $1',
      [category_id]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ error: 'Category not found' });
    }

    // Insert new skill (requires admin approval for new skills)
    const result = await pool.query(
      'INSERT INTO skills (name, description, category_id, is_approved) VALUES ($1, $2, $3, false) RETURNING id, name, description, category_id, is_approved',
      [name, description, category_id]
    );

    res.status(201).json({
      message: 'Skill submitted for approval',
      skill: result.rows[0]
    });
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's skills
router.get('/my-skills', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT us.id, s.id as skill_id, s.name, s.description, 
             us.skill_type, us.experience_level, us.description as user_description,
             sc.name as category_name
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN skill_categories sc ON s.category_id = sc.id
      WHERE us.user_id = $1
      ORDER BY us.skill_type, s.name
    `, [userId]);

    const offeredSkills = result.rows.filter(skill => skill.skill_type === 'offered');
    const wantedSkills = result.rows.filter(skill => skill.skill_type === 'wanted');

    res.json({
      offered_skills: offeredSkills,
      wanted_skills: wantedSkills
    });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add skill to user's profile
router.post('/my-skills', authenticateToken, [
  body('skill_id').isInt({ min: 1 }),
  body('skill_type').isIn(['offered', 'wanted']),
  body('experience_level').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('description').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { skill_id, skill_type, experience_level = 'beginner', description } = req.body;
    const userId = req.user.id;

    // Check if skill exists
    const skillResult = await pool.query(
      'SELECT id, name FROM skills WHERE id = $1 AND is_approved = true',
      [skill_id]
    );

    if (skillResult.rows.length === 0) {
      return res.status(400).json({ error: 'Skill not found or not approved' });
    }

    // Check if user already has this skill with this type
    const existingUserSkill = await pool.query(
      'SELECT id FROM user_skills WHERE user_id = $1 AND skill_id = $2 AND skill_type = $3',
      [userId, skill_id, skill_type]
    );

    if (existingUserSkill.rows.length > 0) {
      return res.status(400).json({ error: 'You already have this skill in your profile' });
    }

    // Insert user skill
    const result = await pool.query(
      'INSERT INTO user_skills (user_id, skill_id, skill_type, experience_level, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, skill_id, skill_type, experience_level, description]
    );

    res.status(201).json({
      message: 'Skill added to your profile',
      user_skill_id: result.rows[0].id,
      skill_name: skillResult.rows[0].name
    });
  } catch (error) {
    console.error('Add user skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's skill
router.put('/my-skills/:id', authenticateToken, [
  body('experience_level').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('description').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userSkillId = req.params.id;
    const { experience_level, description } = req.body;
    const userId = req.user.id;

    // Check if user skill exists and belongs to user
    const userSkillResult = await pool.query(
      'SELECT id FROM user_skills WHERE id = $1 AND user_id = $2',
      [userSkillId, userId]
    );

    if (userSkillResult.rows.length === 0) {
      return res.status(404).json({ error: 'User skill not found' });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (experience_level !== undefined) {
      updateFields.push(`experience_level = $${paramCount}`);
      values.push(experience_level);
      paramCount++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userSkillId);
    values.push(userId);

    const query = `
      UPDATE user_skills 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING id
    `;

    const result = await pool.query(query, values);

    res.json({ message: 'Skill updated successfully' });
  } catch (error) {
    console.error('Update user skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove skill from user's profile
router.delete('/my-skills/:id', authenticateToken, async (req, res) => {
  try {
    const userSkillId = req.params.id;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM user_skills WHERE id = $1 AND user_id = $2 RETURNING id',
      [userSkillId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User skill not found' });
    }

    res.json({ message: 'Skill removed from your profile' });
  } catch (error) {
    console.error('Delete user skill error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get skill statistics
router.get('/statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id, s.name, sc.name as category_name,
        COUNT(CASE WHEN us.skill_type = 'offered' THEN 1 END) as offered_count,
        COUNT(CASE WHEN us.skill_type = 'wanted' THEN 1 END) as wanted_count,
        COUNT(us.id) as total_users
      FROM skills s
      LEFT JOIN user_skills us ON s.id = us.skill_id
      LEFT JOIN skill_categories sc ON s.category_id = sc.id
      WHERE s.is_approved = true
      GROUP BY s.id, s.name, sc.name
      HAVING COUNT(us.id) > 0
      ORDER BY total_users DESC
      LIMIT 20
    `);

    res.json({ skill_stats: result.rows });
  } catch (error) {
    console.error('Get skill statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;