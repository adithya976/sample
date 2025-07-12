const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create a new swap request
router.post('/', authenticateToken, [
  body('provider_id').isInt({ min: 1 }),
  body('requester_skill_id').isInt({ min: 1 }),
  body('provider_skill_id').isInt({ min: 1 }),
  body('message').optional().trim().isLength({ max: 1000 }),
  body('proposed_schedule').optional().isJSON(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { provider_id, requester_skill_id, provider_skill_id, message, proposed_schedule } = req.body;
    const requesterId = req.user.id;

    // Check if requester is trying to swap with themselves
    if (requesterId === provider_id) {
      return res.status(400).json({ error: 'You cannot create a swap request with yourself' });
    }

    // Check if provider exists and is not banned
    const providerResult = await pool.query(
      'SELECT id, name, is_banned, is_public FROM users WHERE id = $1',
      [provider_id]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = providerResult.rows[0];
    if (provider.is_banned) {
      return res.status(400).json({ error: 'Provider account is banned' });
    }

    if (!provider.is_public) {
      return res.status(400).json({ error: 'Provider profile is private' });
    }

    // Verify requester owns the requester skill
    const requesterSkillResult = await pool.query(
      'SELECT us.id, s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.id = $1 AND us.user_id = $2 AND us.skill_type = $3',
      [requester_skill_id, requesterId, 'offered']
    );

    if (requesterSkillResult.rows.length === 0) {
      return res.status(400).json({ error: 'Requester skill not found in your offered skills' });
    }

    // Verify provider has the provider skill
    const providerSkillResult = await pool.query(
      'SELECT us.id, s.name FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.skill_id = $1 AND us.user_id = $2 AND us.skill_type = $3',
      [provider_skill_id, provider_id, 'offered']
    );

    if (providerSkillResult.rows.length === 0) {
      return res.status(400).json({ error: 'Provider does not offer this skill' });
    }

    // Check if there's already a pending request between these users for these skills
    const existingRequest = await pool.query(
      'SELECT id FROM swap_requests WHERE requester_id = $1 AND provider_id = $2 AND requester_skill_id = $3 AND provider_skill_id = $4 AND status = $5',
      [requesterId, provider_id, requester_skill_id, provider_skill_id, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: 'You already have a pending request for these skills' });
    }

    // Create the swap request
    const result = await pool.query(
      'INSERT INTO swap_requests (requester_id, provider_id, requester_skill_id, provider_skill_id, message, proposed_schedule) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
      [requesterId, provider_id, requester_skill_id, provider_skill_id, message, proposed_schedule]
    );

    res.status(201).json({
      message: 'Swap request created successfully',
      swap_request: {
        id: result.rows[0].id,
        requester_skill: requesterSkillResult.rows[0].name,
        provider_skill: providerSkillResult.rows[0].name,
        provider_name: provider.name,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Create swap request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's swap requests (both sent and received)
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', status = 'all', limit = 20, offset = 0 } = req.query;

    let whereClause = '';
    const params = [userId];
    let paramCount = 2;

    if (type === 'sent') {
      whereClause = 'WHERE sr.requester_id = $1';
    } else if (type === 'received') {
      whereClause = 'WHERE sr.provider_id = $1';
    } else {
      whereClause = 'WHERE (sr.requester_id = $1 OR sr.provider_id = $1)';
    }

    if (status !== 'all') {
      whereClause += ` AND sr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    const query = `
      SELECT sr.id, sr.requester_id, sr.provider_id, sr.status, sr.message,
             sr.proposed_schedule, sr.created_at, sr.updated_at,
             ru.name as requester_name, ru.profile_photo as requester_photo,
             pu.name as provider_name, pu.profile_photo as provider_photo,
             rs.name as requester_skill_name, ps.name as provider_skill_name,
             (sr.requester_id = $1) as is_requester
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

    // Parse proposed_schedule if it exists
    result.rows.forEach(row => {
      if (row.proposed_schedule) {
        try {
          row.proposed_schedule = JSON.parse(row.proposed_schedule);
        } catch (e) {
          row.proposed_schedule = null;
        }
      }
    });

    res.json({ swap_requests: result.rows });
  } catch (error) {
    console.error('Get swap requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update swap request status (accept/reject)
router.put('/:id/status', authenticateToken, [
  body('status').isIn(['accepted', 'rejected']),
  body('message').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const swapRequestId = req.params.id;
    const { status, message } = req.body;
    const userId = req.user.id;

    // Check if swap request exists and user is the provider
    const swapResult = await pool.query(
      'SELECT id, requester_id, provider_id, status as current_status FROM swap_requests WHERE id = $1',
      [swapRequestId]
    );

    if (swapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Only the provider can accept/reject
    if (swap.provider_id !== userId) {
      return res.status(403).json({ error: 'Only the provider can accept or reject this request' });
    }

    // Check if request is still pending
    if (swap.current_status !== 'pending') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    // Update the swap request status
    const updateResult = await pool.query(
      'UPDATE swap_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, swapRequestId]
    );

    // If message provided, you might want to store it somewhere or send notification
    res.json({
      message: `Swap request ${status} successfully`,
      swap_request: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Update swap status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark swap as completed
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const swapRequestId = req.params.id;
    const userId = req.user.id;

    // Check if swap request exists and user is part of it
    const swapResult = await pool.query(
      'SELECT id, requester_id, provider_id, status FROM swap_requests WHERE id = $1',
      [swapRequestId]
    );

    if (swapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Only participants can mark as completed
    if (swap.requester_id !== userId && swap.provider_id !== userId) {
      return res.status(403).json({ error: 'You are not authorized to modify this swap request' });
    }

    // Check if request is accepted
    if (swap.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted requests can be marked as completed' });
    }

    // Update the swap request status
    const updateResult = await pool.query(
      'UPDATE swap_requests SET status = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['completed', swapRequestId]
    );

    res.json({
      message: 'Swap marked as completed successfully',
      swap_request: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Complete swap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete/cancel swap request
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const swapRequestId = req.params.id;
    const userId = req.user.id;

    // Check if swap request exists and user is the requester
    const swapResult = await pool.query(
      'SELECT id, requester_id, status FROM swap_requests WHERE id = $1',
      [swapRequestId]
    );

    if (swapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Only the requester can delete/cancel their own request
    if (swap.requester_id !== userId) {
      return res.status(403).json({ error: 'Only the requester can cancel this request' });
    }

    // Can only cancel pending or rejected requests
    if (swap.status === 'accepted' || swap.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel accepted or completed requests' });
    }

    // Delete the swap request
    await pool.query('DELETE FROM swap_requests WHERE id = $1', [swapRequestId]);

    res.json({ message: 'Swap request cancelled successfully' });
  } catch (error) {
    console.error('Cancel swap request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit feedback for a completed swap
router.post('/:id/feedback', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }),
  body('feedback').optional().trim().isLength({ max: 1000 }),
  body('is_anonymous').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const swapRequestId = req.params.id;
    const { rating, feedback, is_anonymous = false } = req.body;
    const reviewerId = req.user.id;

    // Check if swap request exists and is completed
    const swapResult = await pool.query(
      'SELECT id, requester_id, provider_id, status FROM swap_requests WHERE id = $1',
      [swapRequestId]
    );

    if (swapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    const swap = swapResult.rows[0];

    // Only participants can leave feedback
    if (swap.requester_id !== reviewerId && swap.provider_id !== reviewerId) {
      return res.status(403).json({ error: 'You are not authorized to leave feedback for this swap' });
    }

    // Can only leave feedback for completed swaps
    if (swap.status !== 'completed') {
      return res.status(400).json({ error: 'Can only leave feedback for completed swaps' });
    }

    // Determine who is being reviewed
    const revieweeId = swap.requester_id === reviewerId ? swap.provider_id : swap.requester_id;

    // Check if feedback already exists
    const existingFeedback = await pool.query(
      'SELECT id FROM swap_feedback WHERE swap_request_id = $1 AND reviewer_id = $2',
      [swapRequestId, reviewerId]
    );

    if (existingFeedback.rows.length > 0) {
      return res.status(400).json({ error: 'You have already left feedback for this swap' });
    }

    // Insert feedback
    const result = await pool.query(
      'INSERT INTO swap_feedback (swap_request_id, reviewer_id, reviewee_id, rating, feedback, is_anonymous) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
      [swapRequestId, reviewerId, revieweeId, rating, feedback, is_anonymous]
    );

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback_id: result.rows[0].id,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feedback for a user
router.get('/feedback/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = 10, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT sf.id, sf.rating, sf.feedback, sf.is_anonymous, sf.created_at,
             CASE 
               WHEN sf.is_anonymous THEN 'Anonymous' 
               ELSE ru.name 
             END as reviewer_name,
             CASE 
               WHEN sf.is_anonymous THEN NULL 
               ELSE ru.profile_photo 
             END as reviewer_photo,
             rs.name as requester_skill, ps.name as provider_skill
      FROM swap_feedback sf
      JOIN swap_requests sr ON sf.swap_request_id = sr.id
      JOIN skills rs ON sr.requester_skill_id = rs.id
      JOIN skills ps ON sr.provider_skill_id = ps.id
      LEFT JOIN users ru ON sf.reviewer_id = ru.id
      WHERE sf.reviewee_id = $1
      ORDER BY sf.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    // Get average rating
    const avgResult = await pool.query(
      'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total_reviews FROM swap_feedback WHERE reviewee_id = $1',
      [userId]
    );

    const avgRating = avgResult.rows[0];

    res.json({
      feedback: result.rows,
      avg_rating: avgRating.avg_rating ? parseFloat(avgRating.avg_rating) : null,
      total_reviews: parseInt(avgRating.total_reviews)
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get swap statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN requester_id = $1 THEN 1 END) as requests_sent,
        COUNT(CASE WHEN provider_id = $1 THEN 1 END) as requests_received,
        COUNT(CASE WHEN (requester_id = $1 OR provider_id = $1) AND status = 'completed' THEN 1 END) as completed_swaps,
        COUNT(CASE WHEN (requester_id = $1 OR provider_id = $1) AND status = 'pending' THEN 1 END) as pending_swaps,
        COUNT(CASE WHEN requester_id = $1 AND status = 'accepted' THEN 1 END) as accepted_requests,
        COUNT(CASE WHEN provider_id = $1 AND status = 'accepted' THEN 1 END) as accepted_offers
      FROM swap_requests
      WHERE requester_id = $1 OR provider_id = $1
    `, [userId]);

    res.json({ statistics: result.rows[0] });
  } catch (error) {
    console.error('Get swap statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;