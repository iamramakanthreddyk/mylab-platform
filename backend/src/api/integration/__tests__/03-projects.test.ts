/**
 * Project Integration Tests
 * Tests: create, read, update projects with client and lab orgs
 */
import request from 'supertest'
import { initializeTestEnv, cleanupRecords } from './_setup'

describe('Projects API', () => {
  let pool: any
  let app: any
  let token: string
  let platformAdminToken: string
  let workspaceId: string
  let clientOrgId: string
  let labOrgId: string
  const userEmail = `projects-test-${Date.now()}@example.com`
  const password = 'TestPass123!'
  
  // Create test-specific platform admin for org creation
  const platformAdminEmail = `platform-admin-projects-${Date.now()}@example.com`
  const platformAdminPassword = 'PlatformAdmin123!'

  beforeAll(async () => {
    const env = await initializeTestEnv()
    pool = env.pool
    app = env.app

    // Create platform admin user directly in database for testing
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(platformAdminPassword, 10)
    await pool.query(`
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

    // Register and login as regular user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password,
        fullName: 'Project Test User',
        companyName: 'Project Test Workspace'
      })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password })

    token = loginRes.body.token
    workspaceId = loginRes.body.user.workspaceId

    // Create client and lab orgs using platform admin
    const clientRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Project Test Client', type: 'client' })

    clientOrgId = clientRes.body.data.id

    const labRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Project Test Lab', type: 'laboratory' })

    labOrgId = labRes.body.data.id
  })

  afterEach(async () => {
    // Clean created projects after each test
  })

  afterAll(async () => {
    // Cleanup all data
    await cleanupRecords([
      { table: 'users', where: { email: userEmail } },
      { table: 'users', where: { email: platformAdminEmail } },
      { table: 'organizations', where: { name: 'Project Test Workspace' } },
      { table: 'organizations', where: { name: 'Project Test Client' } },
      { table: 'organizations', where: { name: 'Project Test Lab' } }
    ])
  })

  it('should create a project with clientOrgId and executingOrgId', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Project',
        description: 'A test project',
        clientOrgId,
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })
      .expect(201)

    expect(res.body.data.id).toBeTruthy()
    expect(res.body.data.name).toBe('Test Project')
    expect(res.body.data.clientOrgId).toBe(clientOrgId)
    expect(res.body.data.executingOrgId).toBe(labOrgId)

    // Cleanup
    await cleanupRecords([{ table: 'Projects', where: { name: 'Test Project' } }])
  })

  it('should create a project with externalClientName', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'External Client Project',
        description: 'Project with external client',
        externalClientName: 'External Corp',
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })
      .expect(201)

    expect(res.body.data.externalClientName).toBe('External Corp')
    expect(res.body.data.executingOrgId).toBe(labOrgId)

    // Cleanup
    await cleanupRecords([{ table: 'Projects', where: { name: 'External Client Project' } }])
  })

  it('should require either clientOrgId or externalClientName', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Invalid Project',
        description: 'No client info',
        executingOrgId: labOrgId
      })
      .expect(400)

    expect(res.body.error).toBeTruthy()
  })

  it('should require authorization', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({
        name: 'Unauthorized Project',
        clientOrgId,
        executingOrgId: labOrgId
      })
      .expect(401)

    expect(res.body.error).toBeTruthy()
  })

  it('should allow multiple projects with same orgs', async () => {
    const res1 = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Project A',
        clientOrgId,
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })
      .expect(201)

    const res2 = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Project B',
        clientOrgId,
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })
      .expect(201)

    expect(res1.body.data.id).not.toBe(res2.body.data.id)

    // Cleanup
    await cleanupRecords([
      { table: 'Projects', where: { name: 'Project A' } },
      { table: 'Projects', where: { name: 'Project B' } }
    ])
  })
})
