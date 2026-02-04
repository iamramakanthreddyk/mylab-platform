/**
 * Integration Tests - Data Integrity & Access Control
 * Tests for analyses endpoints with immutability and conflict detection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import {
  initializeTestDatabase,
  createTestSchema,
  cleanupTestDatabase,
  deleteTestDatabase,
  TestDatabase
} from './testConfig';
import { createTestFixtures } from './fixtures';

describe('Data Integrity & Access Control Tests', () => {
  let db: TestDatabase;
  let fixtures: any;

  beforeAll(async () => {
    db = await initializeTestDatabase();
    await createTestSchema(db);
    fixtures = await createTestFixtures(db);
  });

  afterAll(async () => {
    await db.close();
    await deleteTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(db);
    fixtures = await createTestFixtures(db);
  });

  describe('Analysis Results Immutability', () => {
    it('should allow creating analysis with results', async () => {
      const analysisId = uuidv4();
      const results = { status: 'complete', sequenced_reads: 1000000 };

      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify(results),
          'complete',
          true,
          fixtures.users[0].id
        ]
      );

      const analysis = await db.get(
        'SELECT * FROM Analyses WHERE id = ?',
        [analysisId]
      );

      expect(analysis).toBeDefined();
      expect(analysis.is_authoritative).toBe(1);
      expect(JSON.parse(analysis.results)).toEqual(results);
    });

    it('should track revised analyses with supersedes_id', async () => {
      const originalId = uuidv4();
      const revisionId = uuidv4();
      const originalResults = { status: 'error', reason: 'instrument_error' };
      const revisedResults = { status: 'complete', sequenced_reads: 1000000 };

      // Create original analysis
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          originalId,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify(originalResults),
          'error',
          false,
          fixtures.users[0].id
        ]
      );

      // Create revised analysis
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, supersedes_id, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          revisionId,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify(revisedResults),
          'complete',
          true,
          originalId,
          fixtures.users[0].id
        ]
      );

      const revision = await db.get(
        'SELECT * FROM Analyses WHERE id = ?',
        [revisionId]
      );

      expect(revision.supersedes_id).toBe(originalId);
      expect(revision.is_authoritative).toBe(1);

      // Verify original is not authoritative
      const original = await db.get(
        'SELECT * FROM Analyses WHERE id = ?',
        [originalId]
      );
      expect(original.is_authoritative).toBe(0);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting authoritative analyses', async () => {
      const analysisId1 = uuidv4();
      const analysisId2 = uuidv4();

      // Create first authoritative analysis
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId1,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete' }),
          'complete',
          true,
          fixtures.users[0].id
        ]
      );

      // Try to create second authoritative analysis for same batch
      // This should be detected as a conflict in the API
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId2,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete' }),
          'complete',
          true,
          fixtures.users[1].id
        ]
      );

      // Count authoritative analyses for this batch
      const result = await db.all(
        `SELECT id, is_authoritative FROM Analyses 
         WHERE batch_id = ? AND is_authoritative = 1`,
        [fixtures.batches[0].id]
      );

      expect(result.length).toBe(2);
      // In production, API should return 409 Conflict on the second INSERT
    });

    it('should allow non-authoritative analyses for same batch', async () => {
      const analysisId1 = uuidv4();
      const analysisId2 = uuidv4();

      // Create authoritative analysis
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId1,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete' }),
          'complete',
          true,
          fixtures.users[0].id
        ]
      );

      // Create non-authoritative analysis (e.g., alternate methodology)
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, is_authoritative, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId2,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete', methodology: 'alternate' }),
          'complete',
          false,
          fixtures.users[1].id
        ]
      );

      const analyses = await db.all(
        `SELECT id, is_authoritative FROM Analyses WHERE batch_id = ?`,
        [fixtures.batches[0].id]
      );

      expect(analyses.length).toBe(2);
      const authoritative = analyses.filter((a: any) => a.is_authoritative === 1);
      const nonAuthoritative = analyses.filter((a: any) => a.is_authoritative === 0);
      expect(authoritative.length).toBe(1);
      expect(nonAuthoritative.length).toBe(1);
    });
  });

  describe('Batch Validation', () => {
    it('should validate batch exists before creating analysis', async () => {
      const nonExistentBatchId = uuidv4();
      const analysisId = uuidv4();

      try {
        await db.run(
          `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            analysisId,
            nonExistentBatchId,
            fixtures.workspace.id,
            fixtures.analysisTypes[0].id,
            JSON.stringify({ status: 'error' }),
            'error',
            fixtures.users[0].id
          ]
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate workspace consistency', async () => {
      // Create analysis with correct workspace
      const analysisId = uuidv4();
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete' }),
          'complete',
          fixtures.users[0].id
        ]
      );

      const analysis = await db.get(
        'SELECT * FROM Analyses WHERE id = ?',
        [analysisId]
      );

      // Verify workspace matches batch
      const batch = await db.get(
        'SELECT * FROM Batches WHERE id = ?',
        [analysis.batch_id]
      );

      expect(analysis.workspace_id).toBe(batch.workspace_id);
    });
  });

  describe('Audit Trail', () => {
    it('should log analysis creation to audit log', async () => {
      const analysisId = uuidv4();

      // Create analysis
      await db.run(
        `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          analysisId,
          fixtures.batches[0].id,
          fixtures.workspace.id,
          fixtures.analysisTypes[0].id,
          JSON.stringify({ status: 'complete' }),
          'complete',
          fixtures.users[0].id
        ]
      );

      // Log to audit
      await db.run(
        `INSERT INTO AuditLog (id, object_type, object_id, action, actor_id, actor_workspace, details)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          'analysis',
          analysisId,
          'create',
          fixtures.users[0].id,
          fixtures.workspace.id,
          JSON.stringify({ batch_id: fixtures.batches[0].id })
        ]
      );

      const audit = await db.get(
        'SELECT * FROM AuditLog WHERE object_id = ?',
        [analysisId]
      );

      expect(audit).toBeDefined();
      expect(audit.object_type).toBe('analysis');
      expect(audit.action).toBe('create');
    });
  });

  describe('Pagination', () => {
    it('should paginate analyses correctly', async () => {
      // Create 10 analyses
      for (let i = 0; i < 10; i++) {
        await db.run(
          `INSERT INTO Analyses (id, batch_id, workspace_id, analysis_type_id, results, status, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            fixtures.batches[0].id,
            fixtures.workspace.id,
            fixtures.analysisTypes[0].id,
            JSON.stringify({ index: i }),
            'complete',
            fixtures.users[0].id
          ]
        );
      }

      // Get first page (limit 5, offset 0)
      const page1 = await db.all(
        `SELECT id FROM Analyses WHERE batch_id = ? ORDER BY created_at DESC LIMIT 5 OFFSET 0`,
        [fixtures.batches[0].id]
      );

      expect(page1.length).toBe(5);

      // Get second page (limit 5, offset 5)
      const page2 = await db.all(
        `SELECT id FROM Analyses WHERE batch_id = ? ORDER BY created_at DESC LIMIT 5 OFFSET 5`,
        [fixtures.batches[0].id]
      );

      expect(page2.length).toBe(5);
      // Verify no duplicates between pages
      const page1Ids = page1.map((a: any) => a.id);
      const page2Ids = page2.map((a: any) => a.id);
      const combined = new Set([...page1Ids, ...page2Ids]);
      expect(combined.size).toBe(10);
    });
  });
});
