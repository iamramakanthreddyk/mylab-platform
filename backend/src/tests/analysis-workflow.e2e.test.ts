/**
 * End-to-end workflow test for analysis creation.
 * This test validates the derived-sample -> batch -> analysis flow.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
});

const testState = {
  token: '',
  workspaceId: '',
  userId: '',
  orgId: '',
  projectId: '',
  sampleId: '',
  derivedSampleId: '',
  batchId: '',
  analysisTypeId: '',
  analysisId: ''
};

describe('Analysis Workflow E2E', () => {
  beforeAll(async () => {
    const email = process.env.TEST_ADMIN_EMAIL || 'superadmin@mylab.io';
    const password = process.env.TEST_ADMIN_PASSWORD || 'SuperAdmin123!';

    // Ensure the admin user has a password set.
    await fetch(`${API_URL}/auth/set-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const loginData = await loginResponse.json() as any;
    testState.token = loginData.token;
    testState.workspaceId = loginData.user.workspaceId;
    testState.userId = loginData.user.id;

    // Create a dedicated org for the test workspace.
    testState.orgId = uuidv4();
    await pool.query(
      `INSERT INTO Organizations (id, workspace_id, name, type)
       VALUES ($1, $2, $3, $4::org_type)
       ON CONFLICT DO NOTHING`,
      [testState.orgId, testState.workspaceId, 'E2E Lab Org', 'analyzer']
    );

    // Create a project tied to that org.
    testState.projectId = uuidv4();
    await pool.query(
      `INSERT INTO Projects (id, workspace_id, client_org_id, executing_org_id, name, description, status, workflow_mode, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testState.projectId,
        testState.workspaceId,
        testState.orgId,
        testState.orgId,
        'E2E Analysis Project',
        'Project for analysis workflow test',
        'active',
        'trial_first',
        testState.userId
      ]
    );

    // Create a parent sample.
    testState.sampleId = uuidv4();
    await pool.query(
      `INSERT INTO Samples (id, project_id, workspace_id, sample_id, description, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        testState.sampleId,
        testState.projectId,
        testState.workspaceId,
        'S-TEST-1',
        'Parent sample for E2E analysis',
        'created',
        testState.userId
      ]
    );

    // Create a dedicated analysis type.
    testState.analysisTypeId = uuidv4();
    await pool.query(
      `INSERT INTO AnalysisTypes (id, name, description, category, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (name) DO NOTHING`,
      [
        testState.analysisTypeId,
        `E2E-Analysis-${testState.analysisTypeId.slice(0, 8)}`,
        'E2E analysis type',
        'E2E'
      ]
    );
  });

  afterAll(async () => {
    if (testState.analysisId) {
      await pool.query('DELETE FROM Analyses WHERE id = $1', [testState.analysisId]);
    }
    if (testState.batchId) {
      await pool.query('DELETE FROM BatchItems WHERE batch_id = $1', [testState.batchId]);
      await pool.query('DELETE FROM Batches WHERE id = $1', [testState.batchId]);
    }
    if (testState.derivedSampleId) {
      await pool.query('DELETE FROM DerivedSamples WHERE id = $1', [testState.derivedSampleId]);
    }
    if (testState.sampleId) {
      await pool.query('DELETE FROM Samples WHERE id = $1', [testState.sampleId]);
    }
    if (testState.projectId) {
      await pool.query('DELETE FROM Projects WHERE id = $1', [testState.projectId]);
    }
    if (testState.analysisTypeId) {
      await pool.query('DELETE FROM AnalysisTypes WHERE id = $1', [testState.analysisTypeId]);
    }
    if (testState.orgId) {
      await pool.query('DELETE FROM Organizations WHERE id = $1', [testState.orgId]);
    }

    await pool.end();
  });

  it('creates derived sample, batch, and analysis end-to-end', async () => {
    const derivedResponse = await fetch(
      `${API_URL}/samples/${testState.workspaceId}/${testState.sampleId}/derived`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testState.token}`
        },
        body: JSON.stringify({
          derived_id: 'S-TEST-1-D1',
          name: 'S-TEST-1-D1',
          description: 'Derived for analysis test',
          derivation_method: 'as_received'
        })
      }
    );

    expect(derivedResponse.status).toBe(201);
    const derivedData = await derivedResponse.json() as any;
    testState.derivedSampleId = derivedData.data?.id || derivedData.id;
    expect(testState.derivedSampleId).toBeTruthy();

    const batchResponse = await fetch(`${API_URL}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testState.token}`
      },
      body: JSON.stringify({
        batchId: `BATCH-E2E-${Date.now()}`,
        description: 'Batch for E2E analysis',
        executionMode: 'platform',
        sampleIds: [testState.derivedSampleId],
        parameters: {
          analysisType: testState.analysisTypeId,
          run: 'e2e'
        }
      })
    });

    expect(batchResponse.status).toBe(201);
    const batchData = await batchResponse.json() as any;
    testState.batchId = batchData.data?.id || batchData.id;
    expect(testState.batchId).toBeTruthy();

    const analysisResponse = await fetch(`${API_URL}/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testState.token}`
      },
      body: JSON.stringify({
        batchId: testState.batchId,
        analysisTypeId: testState.analysisTypeId,
        results: {
          description: 'E2E analysis',
          method: 'baseline',
          parameters: 'default'
        },
        filePath: 'e2e/analysis.txt',
        fileChecksum: 'e2e-checksum',
        fileSizeBytes: 1024,
        status: 'pending',
        executionMode: 'platform',
        executedByOrgId: testState.workspaceId,
        sourceOrgId: testState.workspaceId,
        performedAt: new Date().toISOString()
      })
    });

    expect(analysisResponse.status).toBe(201);
    const analysisData = await analysisResponse.json() as any;
    testState.analysisId = analysisData.data?.id || analysisData.id;
    expect(testState.analysisId).toBeTruthy();
  });
});
