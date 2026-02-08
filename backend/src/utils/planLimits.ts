import { Pool } from 'pg';

export interface PlanLimits {
  planId: string;
  planName: string;
  maxUsers: number | null;
  maxProjects: number | null;
}

export async function getWorkspacePlanLimits(
  pool: Pool,
  workspaceId: string
): Promise<PlanLimits | null> {
  const result = await pool.query(
    `SELECT
      p.id as plan_id,
      p.name as plan_name,
      p.max_users,
      p.max_projects
    FROM Subscriptions s
    JOIN Plans p ON s.plan_id = p.id
    WHERE s.workspace_id = $1
      AND s.deleted_at IS NULL
      AND s.status IN ('active', 'trial')
    ORDER BY s.created_at DESC
    LIMIT 1`,
    [workspaceId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const plan = result.rows[0];
  return {
    planId: plan.plan_id,
    planName: plan.plan_name,
    maxUsers: plan.max_users,
    maxProjects: plan.max_projects,
  };
}

export function isPositiveLimit(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
