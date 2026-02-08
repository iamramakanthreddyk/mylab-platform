import express from 'express';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @route   POST /api/analysis-requests
 * @desc    Create a new analysis request to an external lab
 * @access  Private (any authenticated user)
 * @body    {
 *   to_organization_id: UUID,
 *   sample_id: UUID,
 *   analysis_type_id: UUID,
 *   description: string,
 *   methodology_requirements?: string,
 *   parameters?: object,
 *   priority?: 'low' | 'medium' | 'high' | 'urgent',
 *   due_date?: date,
 *   estimated_duration?: string
 * }
 */
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      to_organization_id,
      sample_id,
      analysis_type_id,
      description,
      methodology_requirements,
      parameters,
      priority = 'medium',
      due_date,
      estimated_duration,
      notes
    } = req.body;

    const workspaceId = (req as any).user.workspace_id;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!to_organization_id || !sample_id || !analysis_type_id || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: to_organization_id, sample_id, analysis_type_id, description' 
      });
    }

    await client.query('BEGIN');

    // Get from_organization_id (current user's organization)
    const orgResult = await client.query(
      `SELECT organization_id FROM Workspace WHERE id = $1`,
      [workspaceId]
    );

    if (orgResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Workspace organization not found' });
    }

    const from_organization_id = orgResult.rows[0].organization_id;

    // Verify sample exists and belongs to workspace
    const sampleResult = await client.query(
      'SELECT id FROM Samples WHERE id = $1 AND workspace_id = $2',
      [sample_id, workspaceId]
    );

    if (sampleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sample not found' });
    }

    // Verify to_organization exists and is a laboratory/testing_facility
    const toOrgResult = await client.query(
      `SELECT id, type FROM Organizations WHERE id = $1 AND type IN ('laboratory', 'testing_facility', 'research_institute')`,
      [to_organization_id]
    );

    if (toOrgResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Target organization must be a laboratory or testing facility' });
    }

    // Verify analysis type exists
    const analysisTypeResult = await client.query(
      'SELECT id FROM AnalysisTypes WHERE id = $1 AND is_active = true',
      [analysis_type_id]
    );

    if (analysisTypeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Analysis type not found or inactive' });
    }

    // Create analysis request
    const result = await client.query(
      `INSERT INTO AnalysisRequests (
        workspace_id, from_organization_id, to_organization_id,
        sample_id, analysis_type_id, description,
        methodology_requirements, parameters, priority,
        due_date, estimated_duration, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        workspaceId,
        from_organization_id,
        to_organization_id,
        sample_id,
        analysis_type_id,
        description,
        methodology_requirements || null,
        parameters ? JSON.stringify(parameters) : null,
        priority,
        due_date || null,
        estimated_duration || null,
        notes || null,
        userId
      ]
    );

    await client.query('COMMIT');

    // Fetch complete request with related data
    const completeRequest = await pool.query(
      `SELECT 
        ar.*,
        from_org.name as from_organization_name,
        to_org.name as to_organization_name,
        s.identifier as sample_identifier,
        at.name as analysis_type_name,
        u.name as created_by_name
      FROM AnalysisRequests ar
      JOIN Organizations from_org ON ar.from_organization_id = from_org.id
      JOIN Organizations to_org ON ar.to_organization_id = to_org.id
      JOIN Samples s ON ar.sample_id = s.id
      JOIN AnalysisTypes at ON ar.analysis_type_id = at.id
      JOIN Users u ON ar.created_by = u.id
      WHERE ar.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'Analysis request created successfully',
      request: completeRequest.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create analysis request error:', error);
    res.status(500).json({ error: 'Failed to create analysis request' });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/analysis-requests/incoming
 * @desc    Get analysis requests sent TO the current organization
 * @access  Private
 * @query   status?: string, priority?: string
 */
router.get('/incoming', authenticate, async (req, res) => {
  try {
    const workspaceId = (req as any).user.workspace_id;
    const { status, priority } = req.query;

    // Get current organization
    const orgResult = await pool.query(
      'SELECT organization_id FROM Workspace WHERE id = $1',
      [workspaceId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace organization not found' });
    }

    const currentOrgId = orgResult.rows[0].organization_id;

    let query = `
      SELECT 
        ar.*,
        from_org.name as from_organization_name,
        to_org.name as to_organization_name,
        s.identifier as sample_identifier,
        s.name as sample_name,
        at.name as analysis_type_name,
        at.category as analysis_category,
        u.name as created_by_name,
        assigned.name as assigned_to_name
      FROM AnalysisRequests ar
      JOIN Organizations from_org ON ar.from_organization_id = from_org.id
      JOIN Organizations to_org ON ar.to_organization_id = to_org.id
      JOIN Samples s ON ar.sample_id = s.id
      JOIN AnalysisTypes at ON ar.analysis_type_id = at.id
      JOIN Users u ON ar.created_by = u.id
      LEFT JOIN Users assigned ON ar.assigned_to = assigned.id
      WHERE ar.to_organization_id = $1
    `;

    const params: any[] = [currentOrgId];
    let paramCount = 2;

    if (status) {
      query += ` AND ar.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND ar.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    query += ' ORDER BY ar.created_at DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Get incoming requests error:', error);
    res.status(500).json({ error: 'Failed to retrieve incoming requests' });
  }
});

/**
 * @route   GET /api/analysis-requests/outgoing
 * @desc    Get analysis requests sent FROM the current organization
 * @access  Private
 * @query   status?: string, priority?: string
 */
router.get('/outgoing', authenticate, async (req, res) => {
  try {
    const workspaceId = (req as any).user.workspace_id;
    const { status, priority } = req.query;

    // Get current organization
    const orgResult = await pool.query(
      'SELECT organization_id FROM Workspace WHERE id = $1',
      [workspaceId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace organization not found' });
    }

    const currentOrgId = orgResult.rows[0].organization_id;

    let query = `
      SELECT 
        ar.*,
        from_org.name as from_organization_name,
        to_org.name as to_organization_name,
        s.identifier as sample_identifier,
        s.name as sample_name,
        at.name as analysis_type_name,
        at.category as analysis_category,
        u.name as created_by_name,
        assigned.name as assigned_to_name
      FROM AnalysisRequests ar
      JOIN Organizations from_org ON ar.from_organization_id = from_org.id
      JOIN Organizations to_org ON ar.to_organization_id = to_org.id
      JOIN Samples s ON ar.sample_id = s.id
      JOIN AnalysisTypes at ON ar.analysis_type_id = at.id
      JOIN Users u ON ar.created_by = u.id
      LEFT JOIN Users assigned ON ar.assigned_to = assigned.id
      WHERE ar.from_organization_id = $1
    `;

    const params: any[] = [currentOrgId];
    let paramCount = 2;

    if (status) {
      query += ` AND ar.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (priority) {
      query += ` AND ar.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }

    query += ' ORDER BY ar.created_at DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch (error) {
    console.error('Get outgoing requests error:', error);
    res.status(500).json({ error: 'Failed to retrieve outgoing requests' });
  }
});

/**
 * @route   GET /api/analysis-requests/:id
 * @desc    Get a specific analysis request by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).user.workspace_id;

    const result = await pool.query(
      `SELECT 
        ar.*,
        from_org.name as from_organization_name,
        from_org.type as from_organization_type,
        to_org.name as to_organization_name,
        to_org.type as to_organization_type,
        s.identifier as sample_identifier,
        s.name as sample_name,
        s.description as sample_description,
        at.name as analysis_type_name,
        at.description as analysis_type_description,
        at.category as analysis_category,
        at.methods as analysis_methods,
        u.name as created_by_name,
        u.email as created_by_email,
        assigned.name as assigned_to_name,
        assigned.email as assigned_to_email
      FROM AnalysisRequests ar
      JOIN Organizations from_org ON ar.from_organization_id = from_org.id
      JOIN Organizations to_org ON ar.to_organization_id = to_org.id
      JOIN Samples s ON ar.sample_id = s.id
      JOIN AnalysisTypes at ON ar.analysis_type_id = at.id
      JOIN Users u ON ar.created_by = u.id
      LEFT JOIN Users assigned ON ar.assigned_to = assigned.id
      WHERE ar.id = $1 AND ar.workspace_id = $2`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis request not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get analysis request error:', error);
    res.status(500).json({ error: 'Failed to retrieve analysis request' });
  }
});

/**
 * @route   POST /api/analysis-requests/:id/accept
 * @desc    Accept an incoming analysis request and optionally assign to a user
 * @access  Private (manager/admin)
 * @body    { assigned_to?: UUID }
 */
router.post('/:id/accept', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    const workspaceId = (req as any).user.workspace_id;
    const userRole = (req as any).user.role;

    // Check permissions
    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await client.query('BEGIN');

    // Verify request exists and is pending
    const requestResult = await client.query(
      `SELECT ar.*, w.organization_id 
       FROM AnalysisRequests ar
       JOIN Workspace w ON ar.workspace_id = w.id
       WHERE ar.id = $1 AND ar.workspace_id = $2`,
      [id, workspaceId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Analysis request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot accept request with status: ${request.status}` });
    }

    // If assigned_to provided, verify user exists in workspace
    if (assigned_to) {
      const userResult = await client.query(
        'SELECT id FROM Users WHERE id = $1 AND workspace_id = $2',
        [assigned_to, workspaceId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assigned user not found in workspace' });
      }
    }

    // Update request status
    const updateResult = await client.query(
      `UPDATE AnalysisRequests 
       SET status = 'accepted', 
           assigned_to = $1,
           accepted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [assigned_to || null, id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Analysis request accepted successfully',
      request: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept analysis request' });
  } finally {
    client.release();
  }
});

/**
 * @route   POST /api/analysis-requests/:id/reject
 * @desc    Reject an incoming analysis request
 * @access  Private (manager/admin)
 * @body    { notes?: string }
 */
router.post('/:id/reject', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const workspaceId = (req as any).user.workspace_id;
    const userRole = (req as any).user.role;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update request status
    const result = await pool.query(
      `UPDATE AnalysisRequests 
       SET status = 'rejected',
           notes = COALESCE($1, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND workspace_id = $3 AND status = 'pending'
       RETURNING *`,
      [notes || null, id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis request not found or cannot be rejected' });
    }

    res.json({
      message: 'Analysis request rejected',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject analysis request' });
  }
});

/**
 * @route   PATCH /api/analysis-requests/:id/status
 * @desc    Update request status (in_progress, completed, etc.)
 * @access  Private (assigned user or manager/admin)
 * @body    { status: string, notes?: string }
 */
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const workspaceId = (req as any).user.workspace_id;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Get request to check assignment
    const requestResult = await pool.query(
      'SELECT * FROM AnalysisRequests WHERE id = $1 AND workspace_id = $2',
      [id, workspaceId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis request not found' });
    }

    const request = requestResult.rows[0];

    // Check permissions: assigned user or manager/admin
    if (request.assigned_to !== userId && !['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update status
    const updateFields: any[] = [status];
    let query = 'UPDATE AnalysisRequests SET status = $1, updated_at = CURRENT_TIMESTAMP';
    
    if (notes) {
      query += ', notes = $2';
      updateFields.push(notes);
    }

    if (status === 'completed') {
      query += ', completed_at = CURRENT_TIMESTAMP';
    }

    query += ` WHERE id = $${updateFields.length + 1} RETURNING *`;
    updateFields.push(id);

    const result = await pool.query(query, updateFields);

    res.json({
      message: 'Request status updated successfully',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

export default router;
