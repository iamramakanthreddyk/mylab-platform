import { Router, Request, Response } from 'express';
import { pool } from '../db';
import {
  authenticate,
  requireObjectAccess,
  auditLog,
  validate,
  asyncHandler
} from '../middleware';
import { 
  ORGANIZATION_SCHEMA,
  SUPPLY_CHAIN_REQUEST_SCHEMA,
  MATERIAL_HANDOFF_SCHEMA,
  ANALYSIS_TYPE_SCHEMA
} from '../database/schemas';

const router = Router();

// ============================================================================
// ORGANIZATION ENDPOINTS
// ============================================================================

// GET /api/supply-chain/partners - Get partner organizations
router.get('/partners', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const workspaceId = req.user!.workspaceId;
    const { type, capabilities, status } = req.query;

    let query = `
      SELECT o.*,
             COUNT(scr.id) as active_collaborations
      FROM Organizations o
      LEFT JOIN SupplyChainRequests scr ON (o.id = scr.from_organization_id OR o.id = scr.to_organization_id)
        AND scr.status IN ('pending', 'accepted', 'in_progress')
        AND scr.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (type && typeof type === 'string') {
      query += ` AND o.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (capabilities) {
      query += ` AND o.capabilities && $${paramIndex}`;  // PostgreSQL array overlap operator
      params.push(Array.isArray(capabilities) ? capabilities : [capabilities]);
      paramIndex++;
    }

    if (status && typeof status === 'string') {
      query += ` AND o.partnership_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` GROUP BY o.id ORDER BY o.name`;

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching partner organizations:', error);
    res.status(500).json({ error: 'Failed to fetch partner organizations' });
  }
}));

// GET /api/supply-chain/partners/:id - Get specific partner organization
router.get('/partners/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT o.*,
             array_agg(DISTINCT ate.name) FILTER (WHERE ate.name IS NOT NULL) as analysis_types,
             COUNT(DISTINCT scr.id) as total_collaborations,
             COUNT(DISTINCT CASE WHEN scr.status = 'completed' THEN scr.id END) as completed_collaborations
      FROM Organizations o
      LEFT JOIN SupplyChainRequests scr ON (o.id = scr.from_organization_id OR o.id = scr.to_organization_id)
        AND scr.deleted_at IS NULL
      LEFT JOIN AnalysisTypes ate ON ate.name = ANY(o.capabilities)
      WHERE o.id = $1 AND o.deleted_at IS NULL
      GROUP BY o.id
    `;

    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
}));

// POST /api/supply-chain/partners - Create new partner organization (Admin only)
router.post('/partners', 
  authenticate, 
  validate(ORGANIZATION_SCHEMA.CreateRequest),
  auditLog('create', 'organization'),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user has admin privileges (implementation depends on your auth system)
    if (req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    try {
      const {
        name,
        type,
        capabilities = [],
        certifications = [],
        location,
        contactEmail,
        contactPhone,
        contactAddress,
        partnershipStatus = 'active'
      } = req.body;

      const query = `
        INSERT INTO Organizations (
          name, type, capabilities, certifications, location, 
          contact_email, contact_phone, contact_address, partnership_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        name,
        type,
        capabilities,
        certifications,
        location,
        contactEmail,
        contactPhone,
        contactAddress,
        partnershipStatus
      ];

      const result = await pool.query(query, values);
      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error creating partner organization:', error);
      res.status(500).json({ error: 'Failed to create partner organization' });
    }
  })
);

// ============================================================================
// SUPPLY CHAIN REQUEST ENDPOINTS
// ============================================================================

// GET /api/supply-chain/collaboration-requests - Get collaboration requests
router.get('/collaboration-requests', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const workspaceId = req.user!.workspaceId;
    const { status, workflowType, priority, assignedToMe } = req.query;

    let query = `
      SELECT scr.*,
             fo.name as from_organization_name,
             fo.type as from_organization_type,
             to_org.name as to_organization_name,
             to_org.type as to_organization_type,
             p.name as project_name,
             u.name as created_by_name,
             assigned_user.name as assigned_user_name
      FROM SupplyChainRequests scr
      JOIN Organizations fo ON scr.from_organization_id = fo.id
      JOIN Organizations to_org ON scr.to_organization_id = to_org.id
      JOIN Projects p ON scr.from_project_id = p.id
      JOIN Users u ON scr.created_by = u.id
      LEFT JOIN Users assigned_user ON scr.assigned_to = assigned_user.id
      WHERE scr.deleted_at IS NULL
        AND p.workspace_id = $1
    `;

    const params = [workspaceId];
    let paramIndex = 2;

    if (status && typeof status === 'string') {
      query += ` AND scr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (workflowType && typeof workflowType === 'string') {
      query += ` AND scr.workflow_type = $${paramIndex}`;
      params.push(workflowType);
      paramIndex++;
    }

    if (priority && typeof priority === 'string') {
      query += ` AND scr.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (assignedToMe === 'true') {
      query += ` AND scr.assigned_to = $${paramIndex}`;
      params.push(req.user!.id);
      paramIndex++;
    }

    query += ` ORDER BY 
      CASE scr.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
      END,
      scr.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching collaboration requests:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration requests' });
  }
}));

// GET /api/supply-chain/collaboration-requests/:id - Get specific collaboration request
router.get('/collaboration-requests/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workspaceId = req.user!.workspaceId;

    const query = `
      SELECT scr.*,
             fo.name as from_organization_name,
             fo.type as from_organization_type,
             fo.contact_email as from_organization_contact,
             to_org.name as to_organization_name,
             to_org.type as to_organization_type,
             p.name as project_name,
             p.description as project_description,
             u.name as created_by_name,
             assigned_user.name as assigned_user_name,
             mh.id as material_handoff_id,
             mh.status as handoff_status,
             mh.shipping_info as shipping_info
      FROM SupplyChainRequests scr
      JOIN Organizations fo ON scr.from_organization_id = fo.id
      JOIN Organizations to_org ON scr.to_organization_id = to_org.id
      JOIN Projects p ON scr.from_project_id = p.id
      JOIN Users u ON scr.created_by = u.id
      LEFT JOIN Users assigned_user ON scr.assigned_to = assigned_user.id
      LEFT JOIN MaterialHandoffs mh ON mh.supply_chain_request_id = scr.id AND mh.deleted_at IS NULL
      WHERE scr.id = $1 
        AND scr.deleted_at IS NULL
        AND p.workspace_id = $2
    `;

    const result = await pool.query(query, [id, workspaceId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collaboration request not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching collaboration request:', error);
    res.status(500).json({ error: 'Failed to fetch collaboration request' });
  }
}));

// POST /api/supply-chain/collaboration-requests - Create new collaboration request
router.post('/collaboration-requests',
  authenticate,
  validate(SUPPLY_CHAIN_REQUEST_SCHEMA.CreateRequest),
  auditLog('create', 'supply_chain_request'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        fromOrganizationId,
        toOrganizationId,
        fromProjectId,
        workflowType,
        materialData,
        requirements = {},
        priority = 'medium',
        dueDate,
        notes
      } = req.body;

      const userId = req.user!.id;

      // Verify project belongs to user's workspace
      const projectCheck = await pool.query(
        'SELECT id FROM Projects WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL',
        [fromProjectId, req.user!.workspaceId]
      );

      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      // Verify organizations exist and are active
      const orgCheck = await pool.query(
        'SELECT id FROM Organizations WHERE id IN ($1, $2) AND partnership_status = $3 AND deleted_at IS NULL',
        [fromOrganizationId, toOrganizationId, 'active']
      );

      if (orgCheck.rows.length !== 2) {
        return res.status(400).json({ error: 'Invalid or inactive organization(s)' });
      }

      const query = `
        INSERT INTO SupplyChainRequests (
          from_organization_id, to_organization_id, from_project_id,
          workflow_type, material_data, requirements, priority,
          due_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        fromOrganizationId,
        toOrganizationId,
        fromProjectId,
        workflowType,
        JSON.stringify(materialData),
        JSON.stringify(requirements),
        priority,
        dueDate,
        notes,
        userId
      ];

      const result = await pool.query(query, values);
      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error creating collaboration request:', error);
      res.status(500).json({ error: 'Failed to create collaboration request' });
    }
  })
);

// PUT /api/supply-chain/collaboration-requests/:id - Update collaboration request
router.put('/collaboration-requests/:id',
  authenticate,
  validate(SUPPLY_CHAIN_REQUEST_SCHEMA.UpdateRequest),
  auditLog('update', 'supply_chain_request'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workspaceId = req.user!.workspaceId;

      // Verify request exists and belongs to user's workspace
      const requestCheck = await pool.query(`
        SELECT scr.id FROM SupplyChainRequests scr
        JOIN Projects p ON scr.from_project_id = p.id
        WHERE scr.id = $1 AND p.workspace_id = $2 AND scr.deleted_at IS NULL
      `, [id, workspaceId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Collaboration request not found' });
      }

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedUpdates = ['status', 'assignedTo', 'notes', 'materialData', 'requirements', 'priority', 'dueDate'];
      
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedUpdates.includes(key) && value !== undefined) {
          const dbField = key === 'assignedTo' ? 'assigned_to' : 
                         key === 'materialData' ? 'material_data' :
                         key === 'dueDate' ? 'due_date' : key;
          
          updateFields.push(`${dbField} = $${paramIndex}`);
          
          if (key === 'materialData' || key === 'requirements') {
            updateValues.push(JSON.stringify(value));
          } else {
            updateValues.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `
        UPDATE SupplyChainRequests 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, updateValues);
      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error updating collaboration request:', error);
      res.status(500).json({ error: 'Failed to update collaboration request' });
    }
  })
);

// POST /api/supply-chain/collaboration-requests/:id/accept - Accept collaboration request
router.post('/collaboration-requests/:id/accept',
  authenticate,
  auditLog('accept', 'supply_chain_request'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { assignedTo, notes } = req.body;
      const workspaceId = req.user!.workspaceId;

      // Verify request exists and is pending
      const requestCheck = await pool.query(`
        SELECT scr.* FROM SupplyChainRequests scr
        JOIN Projects p ON scr.from_project_id = p.id
        WHERE scr.id = $1 AND p.workspace_id = $2 AND scr.status = 'pending' AND scr.deleted_at IS NULL
      `, [id, workspaceId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Collaboration request not found or not in pending status' });
      }

      const query = `
        UPDATE SupplyChainRequests 
        SET status = 'accepted',
            assigned_to = $1,
            notes = COALESCE($2, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await pool.query(query, [assignedTo, notes, id]);
      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error accepting collaboration request:', error);
      res.status(500).json({ error: 'Failed to accept collaboration request' });
    }
  })
);

// POST /api/supply-chain/collaboration-requests/:id/reject - Reject collaboration request
router.post('/collaboration-requests/:id/reject',
  authenticate,
  auditLog('reject', 'supply_chain_request'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const workspaceId = req.user!.workspaceId;

      // Verify request exists and is pending
      const requestCheck = await pool.query(`
        SELECT scr.* FROM SupplyChainRequests scr
        JOIN Projects p ON scr.from_project_id = p.id
        WHERE scr.id = $1 AND p.workspace_id = $2 AND scr.status = 'pending' AND scr.deleted_at IS NULL
      `, [id, workspaceId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Collaboration request not found or not in pending status' });
      }

      const query = `
        UPDATE SupplyChainRequests 
        SET status = 'rejected',
            notes = COALESCE($1, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [reason, id]);
      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error rejecting collaboration request:', error);
      res.status(500).json({ error: 'Failed to reject collaboration request' });
    }
  })
);

// ============================================================================
// MATERIAL HANDOFF ENDPOINTS  
// ============================================================================

// GET /api/supply-chain/material-handoffs - Get material handoffs
router.get('/material-handoffs', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const workspaceId = req.user!.workspaceId;
    const { status, supplyChainRequestId } = req.query;

    let query = `
      SELECT mh.*,
             scr.workflow_type,
             fo.name as from_organization_name,
             to_org.name as to_organization_name,
             p.name as project_name
      FROM MaterialHandoffs mh
      JOIN SupplyChainRequests scr ON mh.supply_chain_request_id = scr.id
      JOIN Organizations fo ON mh.from_organization_id = fo.id
      JOIN Organizations to_org ON mh.to_organization_id = to_org.id
      JOIN Projects p ON scr.from_project_id = p.id
      WHERE mh.deleted_at IS NULL AND p.workspace_id = $1
    `;

    const params = [workspaceId];
    let paramIndex = 2;

    if (status && typeof status === 'string') {
      query += ` AND mh.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (supplyChainRequestId && typeof supplyChainRequestId === 'string') {
      query += ` AND mh.supply_chain_request_id = $${paramIndex}`;
      params.push(supplyChainRequestId);
      paramIndex++;
    }

    query += ` ORDER BY mh.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching material handoffs:', error);
    res.status(500).json({ error: 'Failed to fetch material handoffs' });
  }
}));

// POST /api/supply-chain/material-handoffs - Create material handoff
router.post('/material-handoffs',
  authenticate,
  validate(MATERIAL_HANDOFF_SCHEMA.CreateRequest),
  auditLog('create', 'material_handoff'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        supplyChainRequestId,
        fromOrganizationId,
        toOrganizationId,
        materialId,
        quantity,
        unit,
        shippingInfo = {},
        chainOfCustody
      } = req.body;

      const workspaceId = req.user!.workspaceId;

      // Verify supply chain request exists and belongs to workspace
      const requestCheck = await pool.query(`
        SELECT scr.id FROM SupplyChainRequests scr
        JOIN Projects p ON scr.from_project_id = p.id
        WHERE scr.id = $1 AND p.workspace_id = $2 AND scr.deleted_at IS NULL
      `, [supplyChainRequestId, workspaceId]);

      if (requestCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid supply chain request ID' });
      }

      const query = `
        INSERT INTO MaterialHandoffs (
          supply_chain_request_id, from_organization_id, to_organization_id,
          material_id, quantity, unit, shipping_info, chain_of_custody
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        supplyChainRequestId,
        fromOrganizationId,
        toOrganizationId,
        materialId,
        quantity,
        unit,
        JSON.stringify(shippingInfo),
        JSON.stringify(chainOfCustody)
      ];

      const result = await pool.query(query, values);
      res.status(201).json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error creating material handoff:', error);
      res.status(500).json({ error: 'Failed to create material handoff' });
    }
  })
);

// PUT /api/supply-chain/material-handoffs/:id - Update material handoff
router.put('/material-handoffs/:id',
  authenticate,
  validate(MATERIAL_HANDOFF_SCHEMA.UpdateRequest),
  auditLog('update', 'material_handoff'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workspaceId = req.user!.workspaceId;

      // Verify handoff exists and belongs to user's workspace
      const handoffCheck = await pool.query(`
        SELECT mh.id FROM MaterialHandoffs mh
        JOIN SupplyChainRequests scr ON mh.supply_chain_request_id = scr.id
        JOIN Projects p ON scr.from_project_id = p.id
        WHERE mh.id = $1 AND p.workspace_id = $2 AND mh.deleted_at IS NULL
      `, [id, workspaceId]);

      if (handoffCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Material handoff not found' });
      }

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedUpdates = ['status', 'shippingInfo', 'chainOfCustody', 'quantity', 'unit'];
      
      for (const [key, value] of Object.entries(req.body)) {
        if (allowedUpdates.includes(key) && value !== undefined) {
          const dbField = key === 'shippingInfo' ? 'shipping_info' : 
                         key === 'chainOfCustody' ? 'chain_of_custody' : key;
          
          updateFields.push(`${dbField} = $${paramIndex}`);
          
          if (key === 'shippingInfo' || key === 'chainOfCustody') {
            updateValues.push(JSON.stringify(value));
          } else {
            updateValues.push(value);
          }
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const query = `
        UPDATE MaterialHandoffs 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, updateValues);
      res.json({ data: result.rows[0] });
    } catch (error) {
      console.error('Error updating material handoff:', error);
      res.status(500).json({ error: 'Failed to update material handoff' });
    }
  })
);

// ============================================================================
// ANALYSIS TYPES ENDPOINTS
// ============================================================================

// GET /api/supply-chain/analysis-types - Get available analysis types
router.get('/analysis-types', authenticate, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { category, isActive = 'true' } = req.query;

    let query = `
      SELECT * FROM AnalysisTypes
      WHERE is_active = $1
    `;

    const params: any[] = [isActive === 'true'];
    let paramIndex = 2;

    if (category && typeof category === 'string') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY category, name`;

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching analysis types:', error);
    res.status(500).json({ error: 'Failed to fetch analysis types' });
  }
}));

export default router;