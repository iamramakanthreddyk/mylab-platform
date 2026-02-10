/**
 * Auth Integration Tests
 * Tests: register user, login, token validation
 */
import request from 'supertest'
import { initializeTestEnv, getPool, getApp, cleanupRecords, cleanupTestEnv } from './_setup'

describe('Auth API', () => {
  let pool: any
  let app: any
  const email = `auth-test-${Date.now()}@example.com`
  const password = 'TestPass123!'

  beforeAll(async () => {
    const env = await initializeTestEnv()
    pool = env.pool
    app = env.app
  })

  afterEach(async () => {
    // Cleanup user and workspace created in this test
    await cleanupRecords([
      { table: 'Users', where: { email } },
      { table: 'Organizations', where: { name: 'Auth Test Workspace' } }
    ])
  })

  afterAll(async () => {
    // Close pool connection to allow Jest to exit
    await cleanupTestEnv()
  })

  it('should register a new org admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Auth Test User',
        companyName: 'Auth Test Workspace'
      })
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data.userId).toBeTruthy()
    expect(res.body.data.email).toBe(email)
  })

  it('should login successfully and return token', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Auth Test User',
        companyName: 'Auth Test Workspace'
      })

    // Then login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200)

    expect(loginRes.body.success).toBe(true)
    expect(loginRes.body.token).toBeTruthy()
    expect(loginRes.body.user.email).toBe(email)
    expect(loginRes.body.user.workspaceId).toBeTruthy()
  })

  it('should reject login with invalid credentials', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Auth Test User',
        companyName: 'Auth Test Workspace'
      })

    // Try login with wrong password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword123!' })
      .expect(401)

    expect(loginRes.body.success).toBe(false)
    expect(loginRes.body.error).toBeTruthy()
  })

  it('should reject duplicate registration', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Auth Test User',
        companyName: 'Auth Test Workspace'
      })

    // Try register again with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email,
        password,
        fullName: 'Another User',
        companyName: 'Another Workspace'
      })
      .expect(409)

    expect(res.body.success).toBe(false)
  })
})
