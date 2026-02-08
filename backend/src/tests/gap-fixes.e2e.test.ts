/**
 * End-to-End Test Suite for Gap Fixes
 * Tests complete user workflows from database to UI
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Import app (you may need to export app from index.ts)
// For now, we'll use the base URL
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;

// Test database connection
const pool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
});

// Test data storage
let testContext = {
  adminToken: '',
  adminUser: null as any,
  scientistToken: '',
  scientistUser: null as any,
  workspaceId: '',
  organizationId: '',
  sampleId: '',
  analysisTypeId: '',
  invitationToken: '',
  resetToken: '',
  fileId: '',
  analysisRequestId: ''
};

describe('🔐 User Invitation & Registration Flow', () => {
  
  beforeAll(async () => {
    // Login as admin to get token
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
        password: process.env.TEST_ADMIN_PASSWORD || 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json() as any;
    testContext.adminToken = loginData.token;
    testContext.adminUser = loginData.user;
    testContext.workspaceId = loginData.user.workspace_id;
  });

  it('1.1 should create user invitation with valid data', async () => {
    const response = await fetch(`${API_URL}/users/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        email: 'newscientist@test.com',
        role: 'scientist'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    
    expect(data.invitation).toBeDefined();
    expect(data.invitation.email).toBe('newscientist@test.com');
    expect(data.invitation.role).toBe('scientist');
    expect(data.invitation.token).toBeDefined();
    expect(data.invitation.status).toBe('pending');
    
    testContext.invitationToken = data.invitation.token;
  });

  it('1.2 should prevent duplicate invitation to same email', async () => {
    const response = await fetch(`${API_URL}/users/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        email: 'newscientist@test.com',
        role: 'scientist'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.error).toContain('already has a pending invitation');
  });

  it('1.3 should list pending invitations', async () => {
    const response = await fetch(`${API_URL}/users/invitations`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].email).toBe('newscientist@test.com');
  });

  it('1.4 should accept invitation and create user account', async () => {
    const response = await fetch(`${API_URL}/users/accept-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: testContext.invitationToken,
        name: 'New Scientist',
        email: 'newscientist@test.com',
        password: 'SecurePass123!'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    
    expect(data.user).toBeDefined();
    expect(data.user.name).toBe('New Scientist');
    expect(data.user.role).toBe('scientist');
  });

  it('1.5 should auto-create NotificationSettings for new user', async () => {
    const result = await pool.query(
      `SELECT * FROM NotificationSettings WHERE user_id = (
        SELECT id FROM Users WHERE email = 'newscientist@test.com'
      )`
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].email_enabled).toBe(true);
    expect(result.rows[0].in_app_enabled).toBe(true);
  });

  it('1.6 should allow new user to login', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newscientist@test.com',
        password: 'SecurePass123!'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe('newscientist@test.com');
    
    testContext.scientistToken = data.token;
    testContext.scientistUser = data.user;
  });

  it('1.7 should prevent reusing invitation token', async () => {
    const response = await fetch(`${API_URL}/users/accept-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: testContext.invitationToken,
        name: 'Another User',
        email: 'another@test.com',
        password: 'SecurePass123!'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.error).toContain('already been accepted');
  });

  it('1.8 should allow admin to cancel pending invitation', async () => {
    // Create new invitation
    const createResponse = await fetch(`${API_URL}/users/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        email: 'tocancel@test.com',
        role: 'viewer'
      })
    });
    const createData = await createResponse.json() as any;
    const invitationId = createData.invitation.id;

    // Cancel it
    const cancelResponse = await fetch(`${API_URL}/users/invitations/${invitationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(cancelResponse.status).toBe(200);
  });
});

describe('🔑 Password Reset Flow', () => {
  
  it('2.1 should request password reset and generate token', async () => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newscientist@test.com'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.message).toContain('reset instructions');
  });

  it('2.2 should create reset token in database', async () => {
    const result = await pool.query(
      `SELECT * FROM PasswordResetTokens 
       WHERE user_id = (SELECT id FROM Users WHERE email = 'newscientist@test.com')
       ORDER BY created_at DESC LIMIT 1`
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].token).toBeDefined();
    expect(result.rows[0].used_at).toBeNull();
    
    testContext.resetToken = result.rows[0].token;
  });

  it('2.3 should reset password with valid token', async () => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testContext.resetToken,
        new_password: 'NewSecurePass456!'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.message).toContain('successfully reset');
  });

  it('2.4 should mark token as used', async () => {
    const result = await pool.query(
      'SELECT used_at FROM PasswordResetTokens WHERE token = $1',
      [testContext.resetToken]
    );

    expect(result.rows[0].used_at).not.toBeNull();
  });

  it('2.5 should allow login with new password', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newscientist@test.com',
        password: 'NewSecurePass456!'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.token).toBeDefined();
  });

  it('2.6 should reject login with old password', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'newscientist@test.com',
        password: 'SecurePass123!'
      })
    });

    expect(response.status).toBe(401);
  });

  it('2.7 should prevent reusing reset token', async () => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testContext.resetToken,
        new_password: 'AnotherPass789!'
      })
    });

    expect(response.status).toBe(400);
    const data = await response.json() as any;
    expect(data.error).toContain('already been used');
  });

  it('2.8 should return success even for non-existent email (security)', async () => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@test.com'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.message).toContain('reset instructions');
  });
});

describe('📊 Analysis Types Auto-Seeding', () => {
  
  it('3.1 should auto-seed analysis types on first GET request', async () => {
    const response = await fetch(`${API_URL}/analysis-types`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(6);
    
    // Check for seeded types
    const typeNames = data.map((t: any) => t.name);
    expect(typeNames).toContain('Chemical Analysis');
    expect(typeNames).toContain('Physical Testing');
    expect(typeNames).toContain('Microbiological Analysis');
    
    testContext.analysisTypeId = data[0].id;
  });

  it('3.2 should create custom analysis type (admin only)', async () => {
    const response = await fetch(`${API_URL}/analysis-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        name: 'Custom XRF Analysis',
        description: 'Custom analysis type for testing',
        category: 'Custom',
        methods: ['XRF', 'WD-XRF'],
        typical_duration: '2 hours',
        equipment_required: ['XRF Spectrometer']
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    expect(data.analysis_type.name).toBe('Custom XRF Analysis');
  });

  it('3.3 should prevent non-admin from creating analysis types', async () => {
    const response = await fetch(`${API_URL}/analysis-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.scientistToken}`
      },
      body: JSON.stringify({
        name: 'Unauthorized Type',
        description: 'Should fail'
      })
    });

    expect(response.status).toBe(403);
  });
});

describe('📁 File Upload & Download Flow', () => {
  
  let testFilePath: string;

  beforeAll(async () => {
    // Create test sample first
    const sampleResponse = await fetch(`${API_URL}/samples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        identifier: 'TEST-SAMPLE-001',
        name: 'Test Sample for File Upload',
        description: 'Sample created for file upload testing'
      })
    });
    const sampleData = await sampleResponse.json() as any;
    testContext.sampleId = sampleData.id || sampleData.sample?.id;

    // Create test file
    testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'This is a test file for upload testing.');
  });

  afterAll(() => {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('4.1 should upload file with valid entity', async () => {
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(testFilePath)], { type: 'text/plain' });
    formData.append('file', fileBlob, 'test-upload.txt');
    formData.append('entity_type', 'sample');
    formData.append('entity_id', testContext.sampleId);
    formData.append('description', 'Test file upload');

    const response = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: formData
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    
    expect(data.file).toBeDefined();
    expect(data.file.file_name).toBe('test-upload.txt');
    expect(data.file.checksum).toBeDefined();
    expect(data.file.checksum.length).toBe(64); // SHA-256 hex length
    
    testContext.fileId = data.file.id;
  });

  it('4.2 should get file metadata', async () => {
    const response = await fetch(`${API_URL}/files/${testContext.fileId}`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.file_name).toBe('test-upload.txt');
    expect(data.entity_type).toBe('sample');
  });

  it('4.3 should download file with integrity check', async () => {
    const response = await fetch(`${API_URL}/files/${testContext.fileId}/download`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const contentType = response.headers.get('Content-Type');
    expect(contentType).toBe('text/plain');
  });

  it('4.4 should list files for entity', async () => {
    const response = await fetch(`${API_URL}/files/entity/sample/${testContext.sampleId}`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].file_name).toBe('test-upload.txt');
  });

  it('4.5 should update file metadata', async () => {
    const response = await fetch(`${API_URL}/files/${testContext.fileId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        description: 'Updated description',
        is_public: true
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.file.description).toBe('Updated description');
    expect(data.file.is_public).toBe(true);
  });

  it('4.6 should soft delete file', async () => {
    const response = await fetch(`${API_URL}/files/${testContext.fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    
    // Verify soft delete
    const checkResponse = await fetch(`${API_URL}/files/${testContext.fileId}`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });
    expect(checkResponse.status).toBe(404);
  });
});

describe('🔬 Analysis Requests Flow', () => {
  
  beforeAll(async () => {
    // Get organization ID from Organizations table
    const orgResult = await pool.query(
      `SELECT id FROM Organizations WHERE type = 'laboratory' LIMIT 1`
    );
    if (orgResult.rows.length > 0) {
      testContext.organizationId = orgResult.rows[0].id;
    }
  });

  it('5.1 should create analysis request to external lab', async () => {
    const response = await fetch(`${API_URL}/analysis-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        to_organization_id: testContext.organizationId,
        sample_id: testContext.sampleId,
        analysis_type_id: testContext.analysisTypeId,
        description: 'Need comprehensive analysis for regulatory submission',
        methodology_requirements: 'Follow ISO 17025 standards',
        priority: 'high',
        due_date: '2026-03-01'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json() as any;
    
    expect(data.request).toBeDefined();
    expect(data.request.status).toBe('pending');
    expect(data.request.priority).toBe('high');
    
    testContext.analysisRequestId = data.request.id;
  });

  it('5.2 should list incoming requests', async () => {
    const response = await fetch(`${API_URL}/analysis-requests/incoming`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(Array.isArray(data)).toBe(true);
  });

  it('5.3 should list outgoing requests', async () => {
    const response = await fetch(`${API_URL}/analysis-requests/outgoing`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(Array.isArray(data)).toBe(true);
    const foundRequest = data.find((r: any) => r.id === testContext.analysisRequestId);
    expect(foundRequest).toBeDefined();
  });

  it('5.4 should get request details', async () => {
    const response = await fetch(`${API_URL}/analysis-requests/${testContext.analysisRequestId}`, {
      headers: {
        'Authorization': `Bearer ${testContext.adminToken}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.description).toBe('Need comprehensive analysis for regulatory submission');
    expect(data.sample_identifier).toBeDefined();
    expect(data.analysis_type_name).toBeDefined();
  });

  it('5.5 should accept request and assign to user', async () => {
    const response = await fetch(`${API_URL}/analysis-requests/${testContext.analysisRequestId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        assigned_to: testContext.scientistUser.id
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    
    expect(data.request.status).toBe('accepted');
    expect(data.request.assigned_to).toBe(testContext.scientistUser.id);
  });

  it('5.6 should update request status', async () => {
    const response = await fetch(`${API_URL}/analysis-requests/${testContext.analysisRequestId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        status: 'in_progress',
        notes: 'Started analysis work'
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;
    expect(data.request.status).toBe('in_progress');
  });

  it('5.7 should reject request', async () => {
    // Create another request to reject
    const createResponse = await fetch(`${API_URL}/analysis-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        to_organization_id: testContext.organizationId,
        sample_id: testContext.sampleId,
        analysis_type_id: testContext.analysisTypeId,
        description: 'Request to be rejected',
        priority: 'low'
      })
    });
    const createData = await createResponse.json() as any;
    
    const rejectResponse = await fetch(`${API_URL}/analysis-requests/${createData.request.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testContext.adminToken}`
      },
      body: JSON.stringify({
        notes: 'Insufficient capacity'
      })
    });

    expect(rejectResponse.status).toBe(200);
    const rejectData = await rejectResponse.json() as any;
    expect(rejectData.request.status).toBe('rejected');
  });
});

describe('🧹 Cleanup & Database Verification', () => {
  
  it('6.1 should verify all tables exist', async () => {
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'UserInvitations',
        'PasswordResetTokens',
        'FileDocuments',
        'AnalysisRequests',
        'NotificationSettings'
      )
      ORDER BY table_name
    `);

    expect(result.rows.length).toBe(5);
  });

  it('6.2 should verify trigger exists', async () => {
    const result = await pool.query(`
      SELECT * FROM pg_trigger 
      WHERE tgname = 'trigger_create_notification_settings'
    `);

    expect(result.rows.length).toBe(1);
  });

  it('6.3 should verify indexes exist', async () => {
    const result = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename IN ('userinvitations', 'passwordresettokens', 'filedocuments', 'analysisrequests')
      AND indexname LIKE 'idx_%'
    `);

    expect(result.rows.length).toBeGreaterThan(10);
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });
});
