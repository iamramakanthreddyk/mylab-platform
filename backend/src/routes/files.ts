import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { pool } from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const workspaceId = (req as any).user?.workspace_id;
    if (!workspaceId) {
      return cb(new Error('Workspace ID required'), '');
    }
    
    const uploadDir = path.join(process.cwd(), 'uploads', workspaceId);
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'text/plain',
    'application/json'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

// Calculate file checksum
async function calculateChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const fileBuffer = await fs.readFile(filePath);
  hash.update(fileBuffer);
  return hash.digest('hex');
}

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file and associate it with an entity
 * @access  Private
 * @body    {
 *   entity_type: 'sample' | 'analysis' | 'project' | 'batch' | 'organization',
 *   entity_id: UUID,
 *   description?: string,
 *   is_public?: boolean,
 *   metadata?: object
 * }
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entity_type, entity_id, description, is_public = false, metadata } = req.body;
    const workspaceId = (req as any).user.workspace_id;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!entity_type || !entity_id) {
      await fs.unlink(req.file.path); // Clean up uploaded file
      return res.status(400).json({ error: 'entity_type and entity_id are required' });
    }

    // Validate entity exists based on type
    let entityCheck;
    switch (entity_type) {
      case 'sample':
        entityCheck = await client.query('SELECT id FROM Samples WHERE id = $1 AND workspace_id = $2', [entity_id, workspaceId]);
        break;
      case 'analysis':
        entityCheck = await client.query('SELECT id FROM Analyses WHERE id = $1 AND workspace_id = $2', [entity_id, workspaceId]);
        break;
      case 'project':
        entityCheck = await client.query('SELECT id FROM Projects WHERE id = $1 AND workspace_id = $2', [entity_id, workspaceId]);
        break;
      case 'batch':
        entityCheck = await client.query('SELECT id FROM Batches WHERE id = $1 AND workspace_id = $2', [entity_id, workspaceId]);
        break;
      case 'organization':
        entityCheck = await client.query('SELECT id FROM Organizations WHERE id = $1', [entity_id]);
        break;
      default:
        await fs.unlink(req.file.path);
        return res.status(400).json({ error: 'Invalid entity_type' });
    }

    if (entityCheck.rows.length === 0) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ error: `${entity_type} not found` });
    }

    // Calculate checksum for integrity verification
    const checksum = await calculateChecksum(req.file.path);

    // Insert file document record
    const result = await client.query(
      `INSERT INTO FileDocuments (
        workspace_id, uploaded_by, entity_type, entity_id,
        file_name, file_path, file_size, file_type,
        checksum, description, metadata, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        workspaceId,
        userId,
        entity_type,
        entity_id,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        checksum,
        description || null,
        metadata ? JSON.stringify(metadata) : null,
        is_public
      ]
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      file: result.rows[0]
    });

  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up file if database insert failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up file:', unlinkError);
      }
    }
    
    res.status(500).json({ error: 'Failed to upload file' });
  } finally {
    client.release();
  }
});

/**
 * @route   GET /api/files/:id
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).user.workspace_id;

    const result = await pool.query(
      `SELECT fd.*, u.name as uploaded_by_name
       FROM FileDocuments fd
       JOIN Users u ON fd.uploaded_by = u.id
       WHERE fd.id = $1 AND fd.workspace_id = $2 AND fd.deleted_at IS NULL`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get file metadata error:', error);
    res.status(500).json({ error: 'Failed to retrieve file metadata' });
  }
});

/**
 * @route   GET /api/files/:id/download
 * @desc    Download a file
 * @access  Private
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).user.workspace_id;

    // Get file metadata
    const result = await pool.query(
      `SELECT * FROM FileDocuments 
       WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Verify file exists on disk
    try {
      await fs.access(file.file_path);
    } catch {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Verify checksum for integrity
    const currentChecksum = await calculateChecksum(file.file_path);
    if (currentChecksum !== file.checksum) {
      console.error(`Checksum mismatch for file ${id}`);
      return res.status(500).json({ error: 'File integrity check failed' });
    }

    // Set headers for download
    res.setHeader('Content-Type', file.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
    res.setHeader('Content-Length', file.file_size);

    // Stream file to response
    const fileStream = await fs.readFile(file.file_path);
    res.send(fileStream);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * @route   GET /api/files/entity/:entity_type/:entity_id
 * @desc    Get all files for a specific entity
 * @access  Private
 */
router.get('/entity/:entity_type/:entity_id', authenticate, async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;
    const workspaceId = (req as any).user.workspace_id;

    const result = await pool.query(
      `SELECT fd.*, u.name as uploaded_by_name
       FROM FileDocuments fd
       JOIN Users u ON fd.uploaded_by = u.id
       WHERE fd.entity_type = $1 
         AND fd.entity_id = $2 
         AND fd.workspace_id = $3 
         AND fd.deleted_at IS NULL
       ORDER BY fd.created_at DESC`,
      [entity_type, entity_id, workspaceId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get entity files error:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

/**
 * @route   DELETE /api/files/:id
 * @desc    Soft delete a file (mark as deleted, keep on disk for recovery)
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = (req as any).user.workspace_id;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Get file to check ownership
    const fileResult = await pool.query(
      'SELECT * FROM FileDocuments WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL',
      [id, workspaceId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Check permissions: owner or admin/manager
    if (file.uploaded_by !== userId && !['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete this file' });
    }

    // Soft delete
    await pool.query(
      'UPDATE FileDocuments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * @route   PATCH /api/files/:id
 * @desc    Update file metadata
 * @access  Private
 */
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, is_public, metadata } = req.body;
    const workspaceId = (req as any).user.workspace_id;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Get file to check ownership
    const fileResult = await pool.query(
      'SELECT * FROM FileDocuments WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL',
      [id, workspaceId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Check permissions
    if (file.uploaded_by !== userId && !['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update this file' });
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }

    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramCount++}`);
      updateValues.push(is_public);
    }

    if (metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount++}`);
      updateValues.push(JSON.stringify(metadata));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE FileDocuments 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    res.json({
      message: 'File metadata updated successfully',
      file: result.rows[0]
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file metadata' });
  }
});

export default router;
