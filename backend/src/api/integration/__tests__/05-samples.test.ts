/**
 * Samples Integration Tests
 * Tests: create, read, update samples within a project/trial
 */
import request from 'supertest'
import { initializeTestEnv, cleanupRecords } from './_setup'

describe('Samples API', () => {
  let pool: any
  let app: any
  let token: string
  let platformAdminToken: string
  let workspaceId: string
  let projectId: string
  let trialId: string
  let clientOrgId: string
  let labOrgId: string
  const userEmail = `samples-test-${Date.now()}@example.com`
  const password = 'TestPass123!'
  
  const platformAdminEmail = `platform-admin-samples-${Date.now()}@example.com`
  const platformAdminPassword = 'PlatformAdmin123!'

  beforeAll(async () => {
    const env = await initializeTestEnv()
    pool = env.pool
    app = env.app

    // Create platform admin
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(platformAdminPassword, 10)
    await pool.query(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
    `, [platformAdminEmail, hashedPassword, 'Test Platform Admin', 'platform_admin'])

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: platformAdminEmail, password: platformAdminPassword })
    platformAdminToken = adminLoginRes.body.token

    // Register and login
    await request(app)
      .post('/api/auth/register')
      .send({
        email: userEmail,
        password,
        fullName: 'Samples Test User',
        companyName: 'Samples Test Workspace'
      })

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password })

    token = loginRes.body.token
    workspaceId = loginRes.body.user.workspaceId

    // Create orgs using platform admin
    const clientRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Samples Client', type: 'client' })

    clientOrgId = clientRes.body.data.id

    const labRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Samples Lab', type: 'laboratory' })

    labOrgId = labRes.body.data.id

    // Create project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Samples Test Project',
        description: 'For sample testing',
        clientOrgId,
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })

    projectId = projectRes.body.data.id

    // Create trial
    const trialRes = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Samples Test Trial',
        objective: 'For sampling',
        status: 'planned'
      })

    trialId = trialRes.body.id || trialRes.body.data?.id
  })

  afterAll(async () => {
    // Cleanup all data
    await cleanupRecords([
      { table: 'users', where: { email: userEmail } },
      { table: 'users', where: { email: platformAdminEmail } },
      { table: 'organizations', where: { name: 'Samples Test Workspace' } },
      { table: 'organizations', where: { name: 'Samples Client' } },
      { table: 'organizations', where: { name: 'Samples Lab' } }
    ])
  })

  it('should create a sample with projectId and trialId', async () => {
    const res = await request(app)
      .post('/api/samples')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        trialId,
        sampleId: 'S-001',
        description: 'Test sample',
        type: 'material'
      })
      .expect(201)

    expect(res.body.data?.id || res.body.id).toBeTruthy()
    expect(res.body.data?.sample_id || res.body.sample_id).toBe('S-001')

    // Cleanup
    const sampleId = res.body.data?.id || res.body.id
    await cleanupRecords([{ table: 'Samples', where: { id: sampleId } }])
  })

  it('should create sample with metadata', async () => {
    const res = await request(app)
      .post('/api/samples')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        trialId,
        sampleId: 'S-002',
        description: 'Sample with metadata',
        type: 'liquid',
        metadata: { volume: '100ml', color: 'clear' }
      })
      .expect(201)

    expect(res.body.data?.id || res.body.id).toBeTruthy()

    // Cleanup
    const sampleId = res.body.data?.id || res.body.id
    await cleanupRecords([{ table: 'Samples', where: { id: sampleId } }])
  })

  it('should create sample without trialId', async () => {
    const res = await request(app)
      .post('/api/samples')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        sampleId: 'S-003',
        description: 'Sample without trial',
        type: 'solid'
      })
      .expect(201)

    expect(res.body.data?.id || res.body.id).toBeTruthy()

    // Cleanup
    const sampleId = res.body.data?.id || res.body.id
    await cleanupRecords([{ table: 'Samples', where: { id: sampleId } }])
  })

  it('should require authorization', async () => {
    const res = await request(app)
      .post('/api/samples')
      .send({
        projectId,
        trialId,
        sampleId: 'S-999',
        description: 'Unauthorized',
        type: 'material'
      })
      .expect(401)

    expect(res.body.error).toBeTruthy()
  })

  it('should allow multiple samples per trial', async () => {
    const res1 = await request(app)
      .post('/api/samples')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        trialId,
        sampleId: 'S-M1',
        description: 'Multi sample 1',
        type: 'material'
      })
      .expect(201)

    const res2 = await request(app)
      .post('/api/samples')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        trialId,
        sampleId: 'S-M2',
        description: 'Multi sample 2',
        type: 'material'
      })
      .expect(201)

    const sampleId1 = res1.body.data?.id || res1.body.id
    const sampleId2 = res2.body.data?.id || res2.body.id
    expect(sampleId1).not.toBe(sampleId2)

    // Cleanup
    await cleanupRecords([
      { table: 'Samples', where: { id: sampleId1 } },
      { table: 'Samples', where: { id: sampleId2 } }
    ])
  })
})
