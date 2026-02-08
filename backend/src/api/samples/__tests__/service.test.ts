// Mock db module
jest.mock('../../../db', () => ({
  pool: {
    query: jest.fn()
  }
}));

// Mock utility functions
jest.mock('../../../utils/lineageUtils', () => ({
  canDeleteSample: jest.fn()
}));

jest.mock('../../../utils/stageUtils', () => ({
  validateStageForSampleCreation: jest.fn(),
  canMoveSampleToStage: jest.fn()
}));

import { SampleService } from '../service';
import { SampleNotFoundError, SampleHasDerivedError, InvalidSampleDataError } from '../types';

const { pool } = require('../../../db');
const mockPool = pool as jest.Mocked<typeof pool>;
const { canDeleteSample } = require('../../../utils/lineageUtils');
const { validateStageForSampleCreation, canMoveSampleToStage } = require('../../../utils/stageUtils');

describe('SampleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSamples', () => {
    it('should return list of samples for project', async () => {
      const mockSamples = [
        {
          id: 'sample-1',
          workspace_id: 'ws-1',
          project_id: 'proj-1',
          sample_id: 'SAMPLE-001',
          description: 'Test sample description',
          type: 'DNA',
          status: 'created',
          project_name: 'Test Project',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockSamples });

      const result = await SampleService.listSamples('proj-1', 'ws-1');

      expect(result).toEqual(mockSamples);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT s.*, p.name as project_name'),
        ['proj-1', 'ws-1']
      );
    });

    it('should handle errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(SampleService.listSamples('proj-1', 'ws-1')).rejects.toThrow('DB Error');
    });
  });

  describe('getSample', () => {
    it('should return specific sample', async () => {
      const mockSample = {
        id: 'sample-1',
        workspace_id: 'ws-1',
        project_id: 'proj-1',
        sample_id: 'SAMPLE-001',
        description: 'Test sample description',
        type: 'DNA',
        status: 'created',
        project_name: 'Test Project',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSample] });

      const result = await SampleService.getSample('sample-1', 'ws-1');

      expect(result).toEqual(mockSample);
    });

    it('should throw SampleNotFoundError when not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(SampleService.getSample('sample-1', 'ws-1')).rejects.toThrow(SampleNotFoundError);
    });
  });

  describe('createSample', () => {
    it('should create a new sample', async () => {
      const newSample = {
        id: 'sample-new',
        workspace_id: 'ws-1',
        project_id: 'proj-1',
        sample_id: 'New Sample',
        description: 'A test sample',
        type: 'DNA',
        status: 'created',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock stage validation
      validateStageForSampleCreation.mockResolvedValueOnce({ valid: true });

      mockPool.query.mockResolvedValueOnce({ rows: [newSample] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...newSample, project_name: 'Test Project' }]
      });

      const result = await SampleService.createSample('ws-1', 'user-1', {
        projectId: 'proj-1',
        sampleId: 'New Sample',
        description: 'A test sample',
        type: 'DNA'
      });

      expect(result.sample_id).toBe('New Sample');
      expect(result.project_name).toBe('Test Project');
    });
  });

  describe('updateSample', () => {
    it('should update sample successfully', async () => {
      const updatedSample = {
        id: 'sample-1',
        workspace_id: 'ws-1',
        project_id: 'proj-1',
        sample_id: 'Updated Sample',
        description: 'Updated description',
        type: 'RNA',
        status: 'active',
        metadata: null,
        stage_id: null,
        project_name: 'Test Project',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null
      };

      // Mock stage validation
      canMoveSampleToStage.mockResolvedValueOnce({ canMove: true });

      mockPool.query.mockResolvedValueOnce({ rows: [updatedSample] });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...updatedSample, project_name: 'Test Project' }]
      });

      const result = await SampleService.updateSample('sample-1', 'ws-1', 'proj-1', {
        sampleId: 'Updated Sample',
        description: 'Updated description',
        type: 'RNA'
      });

      expect(result.sample_id).toBe('Updated Sample');
      expect(result.description).toBe('Updated description');
      expect(result.type).toBe('RNA');
      expect(result.project_name).toBe('Test Project');
    });

    it('should throw error when no fields to update', async () => {
      await expect(
        SampleService.updateSample('sample-1', 'ws-1', 'proj-1', {})
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('deleteSample', () => {
    it('should delete sample without derived samples', async () => {
      // Mock canDeleteSample to return true
      canDeleteSample.mockResolvedValueOnce({ canDelete: true, derivedCount: 0 });

      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'sample-1' }] });

      await SampleService.deleteSample('sample-1', 'ws-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Samples'),
        ['sample-1', 'ws-1']
      );
    });
  });
});
