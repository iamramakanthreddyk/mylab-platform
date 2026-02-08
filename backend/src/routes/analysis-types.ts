import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { authenticate, validate, asyncHandler } from '../middleware';
import { ANALYSIS_TYPE_SCHEMA } from '../database/schemas';
import { logToAuditLog } from '../utils/auditUtils';

const router = Router();

// ============================================================================
// ANALYSIS TYPES ENDPOINTS
// ============================================================================

/**
 * GET /api/analysis-types
 * Get all analysis types
 * Requires: Authentication
 */
router.get('/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { category, isActive } = req.query;

    let query = `
      SELECT id, name, description, category, methods, typical_duration, equipment_required, is_active, created_at, updated_at
      FROM AnalysisTypes
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (category && typeof category === 'string') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    query += ` ORDER BY category ASC, name ASC`;

    const result = await pool.query(query, params);

    // If no data exists, seed with default analysis types
    if (result.rows.length === 0) {
      await seedDefaultAnalysisTypes();
      const seedResult = await pool.query(query, params);
      return res.json({
        success: true,
        data: seedResult.rows,
        count: seedResult.rows.length,
        message: 'Default analysis types seeded',
      });
    }

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  })
);

/**
 * GET /api/analysis-types/:id
 * Get analysis type details
 * Requires: Authentication
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM AnalysisTypes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis type not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * POST /api/analysis-types
 * Create new analysis type
 * Requires: Admin role
 */
router.post('/',
  authenticate,
  validate(ANALYSIS_TYPE_SCHEMA.CreateRequest),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, category, methods, typicalDuration, equipmentRequired, isActive = true } = req.body;

    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create analysis types' });
    }

    const result = await pool.query(
      `INSERT INTO AnalysisTypes (name, description, category, methods, typical_duration, equipment_required, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, category, methods, typicalDuration, equipmentRequired, isActive]
    );

    const analysisType = result.rows[0];

    // Audit log
    await logToAuditLog(pool, {
      objectType: 'analysis_type',
      objectId: analysisType.id,
      action: 'analysis_type_created',
      actorId: req.user!.id,
      actorWorkspace: req.user!.workspaceId,
      details: { name, category },
    });

    res.status(201).json({
      success: true,
      data: analysisType,
    });
  })
);

/**
 * PATCH /api/analysis-types/:id
 * Update analysis type
 * Requires: Admin role
 */
router.patch('/:id',
  authenticate,
  validate(ANALYSIS_TYPE_SCHEMA.UpdateRequest),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update analysis types' });
    }

    const { name, description, category, methods, typicalDuration, equipmentRequired, isActive } = req.body;

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description);
      paramIndex++;
    }

    if (category !== undefined) {
      updateFields.push(`category = $${paramIndex}`);
      updateValues.push(category);
      paramIndex++;
    }

    if (methods !== undefined) {
      updateFields.push(`methods = $${paramIndex}`);
      updateValues.push(methods);
      paramIndex++;
    }

    if (typicalDuration !== undefined) {
      updateFields.push(`typical_duration = $${paramIndex}`);
      updateValues.push(typicalDuration);
      paramIndex++;
    }

    if (equipmentRequired !== undefined) {
      updateFields.push(`equipment_required = $${paramIndex}`);
      updateValues.push(equipmentRequired);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE AnalysisTypes 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis type not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  })
);

/**
 * DELETE /api/analysis-types/:id
 * Deactivate analysis type
 * Requires: Admin role
 */
router.delete('/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can deactivate analysis types' });
    }

    const result = await pool.query(
      'UPDATE AnalysisTypes SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis type not found' });
    }

    res.json({
      success: true,
      message: 'Analysis type deactivated successfully',
    });
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function seedDefaultAnalysisTypes() {
  const defaultTypes = [
    {
      name: 'Chemical Analysis',
      description: 'Comprehensive chemical composition analysis',
      category: 'Chemistry',
      methods: ['GC-MS', 'HPLC', 'IC'],
      typical_duration: '2-3 days',
      equipment_required: ['Gas Chromatograph', 'HPLC System'],
    },
    {
      name: 'Physical Testing',
      description: 'Physical properties and mechanical testing',
      category: 'Physical',
      methods: ['Tensile Testing', 'Hardness Testing', 'Impact Testing'],
      typical_duration: '1-2 days',
      equipment_required: ['Universal Testing Machine', 'Hardness Tester'],
    },
    {
      name: 'Microbiological Analysis',
      description: 'Microbial contamination and identification',
      category: 'Microbiology',
      methods: ['Culture-based', 'PCR', 'MALDI-TOF'],
      typical_duration: '3-5 days',
      equipment_required: ['Incubator', 'Microscope', 'PCR Machine'],
    },
    {
      name: 'Spectroscopy',
      description: 'Spectroscopic characterization',
      category: 'Spectroscopy',
      methods: ['NMR', 'UV-Vis', 'FTIR'],
      typical_duration: '1-2 days',
      equipment_required: ['NMR Spectrometer', 'UV-Vis Spectrophotometer', 'FTIR'],
    },
    {
      name: 'Elemental Analysis',
      description: 'Elemental composition determination',
      category: 'Chemistry',
      methods: ['ICP-MS', 'XRF', 'AAS'],
      typical_duration: '2-3 days',
      equipment_required: ['ICP-MS System', 'XRF Analyzer'],
    },
    {
      name: 'Thermal Analysis',
      description: 'Thermal properties characterization',
      category: 'Physical',
      methods: ['DSC', 'TGA', 'DMA'],
      typical_duration: '1-2 days',
      equipment_required: ['DSC', 'TGA', 'DMA'],
    },
  ];

  for (const type of defaultTypes) {
    await pool.query(
      `INSERT INTO AnalysisTypes (name, description, category, methods, typical_duration, equipment_required, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (name) DO NOTHING`,
      [type.name, type.description, type.category, type.methods, type.typical_duration, type.equipment_required]
    );
  }
}

export default router;
