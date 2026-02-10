import { ProjectService } from '../service';
import { ProjectNotFoundError, InvalidProjectDataError } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../../db';

describe('ProjectService', () => {
  let testWorkspaceId: string;
  let testOrgId1: string;
  let testOrgId2: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test fixtures with real UUIDs
    testWorkspaceId = uuidv4();
    testOrgId1 = uuidv4();
    testOrgId2 = uuidv4();
    testUserId = uuidv4();

    // Create test workspace (organization acts as workspace)
    await pool.query(
      `INSERT INTO Organizations (id, name, slug, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [testWorkspaceId, 'Test Workspace', 'test-workspace', 'client']
    );

    // Create test organizations
    await pool.query(
      `INSERT INTO Organizations (id, workspace_id, name, slug, type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [testOrgId1, testWorkspaceId, 'Test Org 1', 'test-org-1', 'client']
    );
    await pool.query(
      `INSERT INTO Organizations (id, workspace_id, name, slug, type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [testOrgId2, testWorkspaceId, 'Test Org 2', 'test-org-2', 'cro']
    );

    // Create test user
    await pool.query(
      `INSERT INTO Users (id, workspace_id, email, name, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [testUserId, testWorkspaceId, `test-${testUserId}@example.com`, 'Test User', 'hash', 'admin']
    );
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM Projects WHERE workspace_id = $1', [testWorkspaceId]);
    await pool.query('DELETE FROM Users WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM Organizations WHERE id IN ($1, $2, $3)', [testWorkspaceId, testOrgId1, testOrgId2]);
  });

  describe('listProjects', () => {
    it('should return list of projects for workspace', async () => {
      // Create a test project
      const projectId = uuidv4();
      await pool.query(
        `INSERT INTO Projects (id, workspace_id, name, client_org_id, executing_org_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, testWorkspaceId, 'Test Project', testOrgId1, testOrgId2, testUserId]
      );

      const result = await ProjectService.listProjects(testWorkspaceId);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      
      // Cleanup
      await pool.query('DELETE FROM Projects WHERE id = $1', [projectId]);
    });

    it('should return empty array when no projects exist', async () => {
      const emptyWorkspaceId = uuidv4();
      await pool.query(
        `INSERT INTO Organizations (id, name, slug, type) VALUES ($1, $2, $3, $4)`,
        [emptyWorkspaceId, 'Empty Workspace', 'empty-workspace', 'client']
      );

      const result = await ProjectService.listProjects(emptyWorkspaceId);

      expect(result).toEqual([]);
      
      // Cleanup
      await pool.query('DELETE FROM Organizations WHERE id = $1', [emptyWorkspaceId]);
    });

    it('should handle database errors', async () => {
      await expect(ProjectService.listProjects('invalid-uuid')).rejects.toThrow();
    });
  });

 describe('getProject', () => {
    it('should return specific project', async () => {
      const projectId = uuidv4();
      await pool.query(
        `INSERT INTO Projects (id, workspace_id, name, client_org_id, executing_org_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, testWorkspaceId, 'Test Project', testOrgId1, testOrgId2, testUserId]
      );

      const result = await ProjectService.getProject(projectId, testWorkspaceId);

      expect(result).toHaveProperty('id', projectId);
      expect(result).toHaveProperty('name', 'Test Project');
      
      // Cleanup
      await pool.query('DELETE FROM Projects WHERE id = $1', [projectId]);
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      await expect(ProjectService.getProject(uuidv4(), testWorkspaceId)).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const result = await ProjectService.createProject(testWorkspaceId, testUserId, {
        name: 'New Project',
        clientOrgId: testOrgId1,
        executingOrgId: testOrgId2
      });

      expect(result.name).toBe('New Project');
      expect(result).toHaveProperty('id');
      
      // Cleanup
      await pool.query('DELETE FROM Projects WHERE id = $1', [result.id]);
    });

    it('should throw error if organizations do not exist', async () => {
      await expect(
        ProjectService.createProject(testWorkspaceId, testUserId, {
          name: 'New Project',
          clientOrgId: testOrgId1,
          executingOrgId: uuidv4() // Non-existent org
        })
      ).rejects.toThrow(InvalidProjectDataError);
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const projectId = uuidv4();
      await pool.query(
        `INSERT INTO Projects (id, workspace_id, name, client_org_id, executing_org_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, testWorkspaceId, 'Original Name', testOrgId1, testOrgId2, testUserId]
      );

      const result = await ProjectService.updateProject(projectId, testWorkspaceId, {
        name: 'Updated Project'
      });

      expect(result.name).toBe('Updated Project');
      
      // Cleanup
      await pool.query('DELETE FROM Projects WHERE id = $1', [projectId]);
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        ProjectService.updateProject(uuidv4(), testWorkspaceId, {})
      ).rejects.toThrow(InvalidProjectDataError);
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      await expect(
        ProjectService.updateProject(uuidv4(), testWorkspaceId, { name: 'New Name' })
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('deleteProject', () => {
    it('should soft delete project', async () => {
      const projectId = uuidv4();
      await pool.query(
        `INSERT INTO Projects (id, workspace_id, name, client_org_id, executing_org_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, testWorkspaceId, 'To Delete', testOrgId1, testOrgId2, testUserId]
      );

      await ProjectService.deleteProject(projectId, testWorkspaceId);

      // Verify it's soft deleted
      const result = await pool.query(
        'SELECT deleted_at FROM Projects WHERE id = $1',
        [projectId]
      );
      expect(result.rows[0].deleted_at).not.toBeNull();
      
      // Cleanup
      await pool.query('DELETE FROM Projects WHERE id = $1', [projectId]);
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      await expect(ProjectService.deleteProject(uuidv4(), testWorkspaceId)).rejects.toThrow(
        ProjectNotFoundError
      );
    });
  });

  describe('countProjects', () => {
    it('should return project count for workspace', async () => {
      const result = await ProjectService.countProjects(testWorkspaceId);

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
