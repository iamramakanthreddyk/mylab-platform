import { Pool } from 'pg';
import { Request } from 'express';

export interface AuditLogEntry {
  objectType: string;
  objectId: string;
  action: string;
  actorId: string;
  actorWorkspace: string;
  actorOrgId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an action to the AuditLog table
 * Use this for successful mutations (create, update, delete, share, download)
 */
export async function logToAuditLog(
  pool: Pool,
  entry: AuditLogEntry
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO AuditLog (
        object_type,
        object_id,
        action,
        actor_id,
        actor_workspace,
        actor_org_id,
        details,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      entry.objectType,
      entry.objectId,
      entry.action,
      entry.actorId,
      entry.actorWorkspace,
      entry.actorOrgId || null,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.ipAddress || null,
      entry.userAgent || null
    ]);
  } catch (error) {
    console.error('Failed to log action to AuditLog:', error);
    // Don't throw - audit failure shouldn't break the app
  }
}

/**
 * Log a snapshot of sample metadata for historical tracking
 * Call this whenever a sample's metadata or status changes
 */
export async function logSampleMetadataChange(
  pool: Pool,
  sampleId: string,
  workspaceId: string,
  metadataSnapshot: Record<string, any>,
  fieldChanges: Record<string, any>,
  changedByUserId: string,
  changeReason?: string
): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO SampleMetadataHistory (
        sample_id,
        workspace_id,
        metadata_snapshot,
        field_changes,
        changed_by,
        change_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      sampleId,
      workspaceId,
      JSON.stringify(metadataSnapshot),
      JSON.stringify(fieldChanges),
      changedByUserId,
      changeReason || null
    ]);
  } catch (error) {
    console.error('Failed to log sample metadata change:', error);
    // Don't throw - history logging shouldn't break the app
  }
}

/**
 * Get audit log entries for an object
 */
export async function getObjectAuditLog(
  pool: Pool,
  objectType: string,
  objectId: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        al.id,
        al.object_type,
        al.object_id,
        al.action,
        al.actor_id,
        u.email as actor_email,
        u.name as actor_name,
        al.timestamp,
        al.details,
        al.ip_address
      FROM AuditLog al
      LEFT JOIN Users u ON al.actor_id = u.id
      WHERE al.object_type = $1 AND al.object_id = $2
      ORDER BY al.timestamp DESC
      LIMIT $3
    `, [objectType, objectId, limit]);

    return result.rows;
  } catch (error) {
    console.error('Failed to retrieve audit log:', error);
    return [];
  }
}

/**
 * Get metadata history for a sample
 */
export async function getSampleMetadataHistory(
  pool: Pool,
  sampleId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const result = await pool.query(`
      SELECT 
        smh.id,
        smh.sample_id,
        smh.metadata_snapshot,
        smh.field_changes,
        smh.changed_by,
        u.email as changed_by_email,
        u.name as changed_by_name,
        smh.change_reason,
        smh.created_at
      FROM SampleMetadataHistory smh
      LEFT JOIN Users u ON smh.changed_by = u.id
      WHERE smh.sample_id = $1
      ORDER BY smh.created_at DESC
      LIMIT $2
    `, [sampleId, limit]);

    return result.rows;
  } catch (error) {
    console.error('Failed to retrieve sample metadata history:', error);
    return [];
  }
}

/**
 * Get all security events for a workspace
 */
export async function getSecurityEvents(
  pool: Pool,
  workspaceId: string,
  eventType?: string,
  severity?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    let query = `
      SELECT 
        sl.id,
        sl.event_type,
        sl.severity,
        sl.user_id,
        u.email as user_email,
        sl.workspace_id,
        sl.resource_type,
        sl.resource_id,
        sl.reason,
        sl.timestamp,
        sl.ip_address
      FROM SecurityLog sl
      LEFT JOIN Users u ON sl.user_id = u.id
      WHERE sl.workspace_id = $1
    `;
    
    const params: any[] = [workspaceId];

    if (eventType) {
      query += ` AND sl.event_type = $${params.length + 1}`;
      params.push(eventType);
    }

    if (severity) {
      query += ` AND sl.severity = $${params.length + 1}`;
      params.push(severity);
    }

    query += `
      ORDER BY sl.timestamp DESC
      LIMIT $${params.length + 1}
    `;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Failed to retrieve security events:', error);
    return [];
  }
}

/**
 * Create a complete audit trail for a sample showing all changes and access
 */
export async function getSampleAuditTrail(
  pool: Pool,
  sampleId: string
): Promise<{
  sample: any;
  auditLog: any[];
  metadataHistory: any[];
  accessGrants: any[];
}> {
  try {
    // Get sample
    const sampleResult = await pool.query(
      `SELECT * FROM Samples WHERE id = $1`,
      [sampleId]
    );

    // Get audit log
    const auditLog = await getObjectAuditLog(pool, 'sample', sampleId);

    // Get metadata history
    const metadataHistory = await getSampleMetadataHistory(pool, sampleId);

    // Get access grants
    const accessResult = await pool.query(`
      SELECT 
        ag.id,
        ag.granted_to_org_id,
        ag.granted_role,
        o.name as org_name,
        ag.expires_at,
        ag.revoked_at,
        u.email as revoked_by_email,
        ag.revocation_reason,
        ag.created_at
      FROM AccessGrants ag
      LEFT JOIN Organizations o ON ag.granted_to_org_id = o.id
      LEFT JOIN Users u ON ag.revoked_by = u.id
      WHERE ag.object_type = 'sample' AND ag.object_id = $1
      ORDER BY ag.created_at DESC
    `, [sampleId]);

    return {
      sample: sampleResult.rows[0],
      auditLog,
      metadataHistory,
      accessGrants: accessResult.rows
    };
  } catch (error) {
    console.error('Failed to retrieve sample audit trail:', error);
    return {
      sample: null,
      auditLog: [],
      metadataHistory: [],
      accessGrants: []
    };
  }
}
