const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('location').optional().trim().isLength({ max: 255 }),
  body('is_public').optional().isBoolean(),
  body('availability').optional().isJSON(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, location, is_public, availability } = req.body;
    const userId = req.user.id;

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramCount}`);
      values.push(location);
      paramCount++;
    }

    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramCount}`);
      values.push(is_public);
      paramCount++;
    }

    if (availability !== undefined) {
      updateFields.push(`availability = $${paramCount}`);
      values.push(availability);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING id, email, name, location, profile_photo, availability, is_public, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Parse availability if it exists
    if (user.availability) {
      try {
        user.availability = JSON.parse(user.availability);
      } catch (e) {
        user.availability = null;
      }
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile photo
router.post('/profile/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.id;
    const filename = req.file.filename;
    const photoUrl = `/uploads/${filename}`;

    // Get old photo to delete it
    const oldPhotoResult = await pool.query(
      'SELECT profile_photo FROM users WHERE id = $1',
      [userId]
    );

    // Update user profile photo
    const result = await pool.query(
      'UPDATE users SET profile_photo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING profile_photo',
      [photoUrl, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old photo if it exists
    if (oldPhotoResult.rows.length > 0 && oldPhotoResult.rows[0].profile_photo) {
      const oldPhotoPath = path.join(__dirname, '..', oldPhotoResult.rows[0].profile_photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    res.json({ 
      message: 'Profile photo updated successfully', 
      profile_photo: result.rows[0].profile_photo 
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get public user profiles with skills
router.get('/browse', async (req, res) => {
  try {
    const { skill, location, limit = 20, offset = 0 } = req.query;
    
    let query = `
      SELECT DISTINCT u.id, u.name, u.location, u.profile_photo, u.created_at,
             array_agg(
               DISTINCT jsonb_build_object(
                 'id', s.id,
                 'name', s.name,
                 'skill_type', us.skill_type,
                 'experience_level', us.experience_level
               )
             ) FILTER (WHERE s.id IS NOT NULL) as skills
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.is_public = true AND u.is_banned = false
    `;

    const params = [];
    let paramCount = 1;

    if (skill) {
      query += ` AND s.name ILIKE $${paramCount}`;
      params.push(`%${skill}%`);
      paramCount++;
    }

    if (location) {
      query += ` AND u.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
      paramCount++;
    }

    query += ` GROUP BY u.id, u.name, u.location, u.profile_photo, u.created_at
               ORDER BY u.created_at DESC
               LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Browse users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const userResult = await pool.query(
      'SELECT id, name, location, profile_photo, availability, is_public, created_at FROM users WHERE id = $1 AND is_banned = false',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if profile is public or if it's the user's own profile
    const isOwnProfile = req.user && req.user.id === parseInt(userId);
    
    if (!user.is_public && !isOwnProfile) {
      return res.status(403).json({ error: 'Profile is private' });
    }

    // Get user's skills
    const skillsResult = await pool.query(`
      SELECT s.id, s.name, s.description, us.skill_type, us.experience_level, us.description as user_description,
             sc.name as category_name
      FROM user_skills us
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN skill_categories sc ON s.category_id = sc.id
      WHERE us.user_id = $1
      ORDER BY us.skill_type, s.name
    `, [userId]);

    // Get user's feedback/ratings
    const feedbackResult = await pool.query(`
      SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total_reviews
      FROM swap_feedback
      WHERE reviewee_id = $1
    `, [userId]);

    // Parse availability if it exists
    if (user.availability) {
      try {
        user.availability = JSON.parse(user.availability);
      } catch (e) {
        user.availability = null;
      }
    }

    // Organize skills by type
    const offeredSkills = skillsResult.rows.filter(skill => skill.skill_type === 'offered');
    const wantedSkills = skillsResult.rows.filter(skill => skill.skill_type === 'wanted');

    const feedback = feedbackResult.rows[0];

    res.json({
      user: {
        ...user,
        offered_skills: offeredSkills,
        wanted_skills: wantedSkills,
        avg_rating: feedback.avg_rating ? parseFloat(feedback.avg_rating) : null,
        total_reviews: parseInt(feedback.total_reviews)
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users by skill
router.get('/search/:skill', async (req, res) => {
  try {
    const skillName = req.params.skill;
    const { skill_type = 'offered', limit = 20, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT DISTINCT u.id, u.name, u.location, u.profile_photo, 
             s.name as skill_name, us.experience_level,
             AVG(sf.rating)::numeric(3,2) as avg_rating,
             COUNT(sf.rating) as review_count
      FROM users u
      JOIN user_skills us ON u.id = us.user_id
      JOIN skills s ON us.skill_id = s.id
      LEFT JOIN swap_feedback sf ON u.id = sf.reviewee_id
      WHERE s.name ILIKE $1 AND us.skill_type = $2 
            AND u.is_public = true AND u.is_banned = false
      GROUP BY u.id, u.name, u.location, u.profile_photo, s.name, us.experience_level
      ORDER BY avg_rating DESC NULLS LAST, review_count DESC
      LIMIT $3 OFFSET $4
    `, [`%${skillName}%`, skill_type, parseInt(limit), parseInt(offset)]);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;