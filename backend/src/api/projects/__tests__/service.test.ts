import { ProjectService } from '../service';
import { ProjectNotFoundError, InvalidProjectDataError } from '../types';

describe('ProjectService', () => {
  // Mock pool
  const mockPool = {
    query: jest.fn()
  };

  // Mock db module
  jest.mock('../../../db', () => ({
    pool: mockPool
  }));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should return list of projects for workspace', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          workspace_id: 'ws-1',
          name: 'Test Project',
          client_org_name: 'Client Org',
          executing_org_name: 'Executing Org'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockProjects });

      const result = await ProjectService.listProjects('ws-1');

      expect(result).toEqual(mockProjects);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['ws-1']
      );
    });

    it('should return empty array when no projects exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await ProjectService.listProjects('ws-1');

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(ProjectService.listProjects('ws-1')).rejects.toThrow('DB Error');
    });
  });

  describe('getProject', () => {
    it('should return specific project', async () => {
      const mockProject = {
        id: 'proj-1',
        workspace_id: 'ws-1',
        name: 'Test Project',
        client_org_name: 'Client Org',
        executing_org_name: 'Executing Org'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockProject] });

      const result = await ProjectService.getProject('proj-1', 'ws-1');

      expect(result).toEqual(mockProject);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['proj-1', 'ws-1']
      );
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(ProjectService.getProject('proj-1', 'ws-1')).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const newProject = {
        id: 'proj-new',
        workspace_id: 'ws-1',
        name: 'New Project',
        client_org_id: 'org-1',
        executing_org_id: 'org-2',
        created_by: 'user-1'
      };

      // Mock org validation
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'org-1' }, { id: 'org-2' }] });

      // Mock insert
      mockPool.query.mockResolvedValueOnce({ rows: [newProject] });

      // Mock fetch with org names
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...newProject, client_org_name: 'Client', executing_org_name: 'Executor' }]
      });

      const result = await ProjectService.createProject('ws-1', 'user-1', {
        name: 'New Project',
        clientOrgId: 'org-1',
        executingOrgId: 'org-2'
      });

      expect(result.name).toBe('New Project');
      expect(result.client_org_name).toBe('Client');
    });

    it('should throw error if organizations do not exist', async () => {
      // Mock org validation returning only 1 org
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'org-1' }] });

      await expect(
        ProjectService.createProject('ws-1', 'user-1', {
          name: 'New Project',
          clientOrgId: 'org-1',
          executingOrgId: 'org-invalid'
        })
      ).rejects.toThrow(InvalidProjectDataError);
    });
  });

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const updatedProject = {
        id: 'proj-1',
        workspace_id: 'ws-1',
        name: 'Updated Project',
        status: 'completed'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [updatedProject] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...updatedProject, client_org_name: 'Client', executing_org_name: 'Executor' }]
      });

      const result = await ProjectService.updateProject('proj-1', 'ws-1', {
        name: 'Updated Project',
        status: 'completed'
      });

      expect(result.name).toBe('Updated Project');
      expect(result.status).toBe('completed');
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        ProjectService.updateProject('proj-1', 'ws-1', {})
      ).rejects.toThrow(InvalidProjectDataError);
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        ProjectService.updateProject('proj-invalid', 'ws-1', { name: 'New Name' })
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('deleteProject', () => {
    it('should soft delete project', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'proj-1' }] });

      await ProjectService.deleteProject('proj-1', 'ws-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Projects'),
        ['proj-1', 'ws-1']
      );
    });

    it('should throw ProjectNotFoundError when project does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(ProjectService.deleteProject('proj-invalid', 'ws-1')).rejects.toThrow(
        ProjectNotFoundError
      );
    });
  });

  describe('countProjects', () => {
    it('should return project count for workspace', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const result = await ProjectService.countProjects('ws-1');

      expect(result).toBe(5);
    });
  });
});
