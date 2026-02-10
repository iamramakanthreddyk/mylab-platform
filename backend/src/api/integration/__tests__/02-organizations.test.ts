/**
 * Organization Integration Tests
 * Tests: create, read, update orgs; client vs lab orgs
 */
import request from 'supertest'
import { initializeTestEnv, getPool, cleanupRecords } from './_setup'

describe('Organizations API', () => {
  let pool: any
  let app: any
  let token: string
  let platformAdminToken: string
  let workspaceId: string
  const userEmail = `org-test-${Date.now()}@example.com`
  const password = 'TestPass123!'
  
  // Create test-specific platform admin
  const platformAdminEmail = `platform-admin-test-${Date.now()}@example.com`
  const platformAdminPassword = 'PlatformAdmin123!'

  beforeAll(async () => {
    const env = await initializeTestEnv()
    pool = env.pool
    app = env.app

    // Create platform admin user directly in database for testing
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(platformAdminPassword, 10)
    const adminResult = await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [platformAdminEmail, hashedPassword, 'Test Platform Admin', 'platform_admin'])

    // Login as platform admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ 
        email: platformAdminEmail, 
        password: platformAdminPassword 
      })
    
    platformAdminToken = adminLoginRes.body.token

    // Register and login as regular user (for other tests)
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password,
        fullName: 'Org Test User',
        companyName: 'Org Test Workspace'
      })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password })

    token = loginRes.body.token
    workspaceId = loginRes.body.user.workspaceId
  })

  afterEach(async () => {
    // Clean created orgs after each test
    // (Don't delete the workspace/user - that's cleaned up in afterAll)
  })

  afterAll(async () => {
    // Cleanup users and organizations
    await cleanupRecords([
      { table: 'users', where: { email: userEmail } },
      { table: 'users', where: { email: platformAdminEmail } },
      { table: 'organizations', where: { name: 'Org Test Workspace' } }
    ])
  })

  it('should create a client organization', async () => {
    // Only platform admins can create orgs
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        name: 'Test Client Org',
        type: 'client'
      })
      .expect(201)

    expect(res.body.data.id).toBeTruthy()
    expect(res.body.data.name).toBe('Test Client Org')
    expect(res.body.data.type).toBe('client')

    // Cleanup
    await cleanupRecords([{ table: 'organizations', where: { name: 'Test Client Org' } }])
  })

  it('should create a laboratory organization', async () => {
    // Only platform admins can create orgs
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({
        name: 'Test Lab Org',
        type: 'laboratory'
      })
      .expect(201)

    expect(res.body.data.id).toBeTruthy()
    expect(res.body.data.name).toBe('Test Lab Org')
    expect(res.body.data.type).toBe('laboratory')

    // Cleanup
    await cleanupRecords([{ table: 'organizations', where: { name: 'Test Lab Org' } }])
  })

  it('should require authorization', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({
        name: 'Unauthorized Org',
        type: 'client'
      })
      .expect(401)

    expect(res.body.error).toBeTruthy()
  })

  it('should deny org creation for regular users (non-platform-admin)', async () => {
    // Regular user token should be rejected
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Regular User Org',
        type: 'client'
      })
      .expect(403)

    expect(res.body.error).toBeTruthy()
  })

  it('should allow creating multiple orgs by same user', async () => {
    // Platform admin can create multiple orgs
    const res1 = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Client A', type: 'client' })
      .expect(201)

    const res2 = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Client B', type: 'client' })
      .expect(201)

    expect(res1.body.data.id).not.toBe(res2.body.data.id)

    // Cleanup
    await cleanupRecords([
      { table: 'organizations', where: { name: 'Client A' } },
      { table: 'organizations', where: { name: 'Client B' } }
    ])
  })
})
