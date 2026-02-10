/**
 * Trial Integration Tests
 * Tests: create, read, update trials within a project
 */
import request from 'supertest'
import { initializeTestEnv, cleanupRecords } from './_setup'

describe('Trials API', () => {
  let pool: any
  let app: any
  let token: string
  let platformAdminToken: string
  let workspaceId: string
  let projectId: string
  let clientOrgId: string
  let labOrgId: string
  const userEmail = `trials-test-${Date.now()}@example.com`
  const password = 'TestPass123!'
  
  const platformAdminEmail = `platform-admin-trials-${Date.now()}@example.com`
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
        fullName: 'Trials Test User',
        companyName: 'Trials Test Workspace'
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
      .send({ name: 'Trials Client', type: 'client' })

    clientOrgId = clientRes.body.data.id

    const labRes = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send({ name: 'Trials Lab', type: 'laboratory' })

    labOrgId = labRes.body.data.id

    // Create project for all trial tests
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Trials Test Project',
        description: 'For trial testing',
        clientOrgId,
        executingOrgId: labOrgId,
        workflowMode: 'trial_first'
      })

    projectId = projectRes.body.data.id
  })

  afterAll(async () => {
    // Cleanup all data
    await cleanupRecords([
      { table: 'users', where: { email: userEmail } },
      { table: 'users', where: { email: platformAdminEmail } },
      { table: 'organizations', where: { name: 'Trials Test Workspace' } },
      { table: 'organizations', where: { name: 'Trials Client' } },
      { table: 'organizations', where: { name: 'Trials Lab' } }
    ])
  })

  it('should create a trial under a project', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Trial 1',
        objective: 'Test objective',
        status: 'planned'
      })
      .expect(201)

    expect(res.body.id || res.body.data?.id).toBeTruthy()
    expect(res.body.name || res.body.data?.name).toBe('Trial 1')

    // Cleanup
    const trialId = res.body.id || res.body.data?.id
    await cleanupRecords([{ table: 'Trials', where: { id: trialId } }])
  })

  it('should create trial with optional fields', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Trial with params',
        objective: 'Advanced testing',
        parameters: JSON.stringify({ temp: 25, humidity: 60 }),
        equipment: 'Lab equipment list',
        notes: 'Test notes',
        status: 'planned'
      })
      .expect(201)

    expect(res.body.id || res.body.data?.id).toBeTruthy()

    // Cleanup
    const trialId = res.body.id || res.body.data?.id
    await cleanupRecords([{ table: 'Trials', where: { id: trialId } }])
  })

  it('should require authorization', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .send({
        name: 'Unauthorized Trial',
        objective: 'Should fail',
        status: 'planned'
      })
      .expect(401)

    expect(res.body.error).toBeTruthy()
  })

  it('should allow multiple trials in same project', async () => {
    const res1 = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Multi Trial A',
        objective: 'Objective A',
        status: 'planned'
      })
      .expect(201)

    const res2 = await request(app)
      .post(`/api/projects/${projectId}/trials`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Multi Trial B',
        objective: 'Objective B',
        status: 'planned'
      })
      .expect(201)

    const trialId1 = res1.body.id || res1.body.data?.id
    const trialId2 = res2.body.id || res2.body.data?.id
    expect(trialId1).not.toBe(trialId2)

    // Cleanup
    await cleanupRecords([
      { table: 'Trials', where: { id: trialId1 } },
      { table: 'Trials', where: { id: trialId2 } }
    ])
  })
})
