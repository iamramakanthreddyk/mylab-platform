/**
 * Shared test setup - initializes DB and app once for all integration tests
 */
import { Pool } from 'pg'

// Environment setup
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.SKIP_DB_SEED = 'true'

let pool: Pool | null = null
let app: any = null
let dbSetup: any = null
let setupDone = false

/**
 * Check if database tables already exist
 */
async function tablesExist(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'organizations', 'projects')
    `)
    return parseInt(result.rows[0].count) >= 3
  } catch (error) {
    return false
  }
}

/**
 * Initialize shared DB and app - runs only once across all test files
 */
export async function initializeTestEnv() {
  if (setupDone && pool && app) {
    return { pool, app }
  }

  console.log('\n🚀 Initializing test environment...')

  // Dynamically import after env is set
  const { pool: dbPool } = await import('../../../db')
  pool = dbPool

  // Check if tables already exist in DB (avoid recreating)
  const dbReady = await tablesExist(pool)
  
  if (!dbReady) {
    console.log('⚙️  Database tables not found, running setup...')
    const { DatabaseSetup } = await import('../../../database')
    dbSetup = new DatabaseSetup(undefined, pool)
    await dbSetup.setupDatabase()
    console.log('✅ Database schema created')
  } else {
    console.log('✅ Database tables already exist, skipping setup')
  }

  const appModule = await import('../../../index')
  app = appModule.default

  setupDone = true
  console.log('✅ Test environment ready\n')

  return { pool, app }
}

/**
 * Get shared pool (must call initializeTestEnv first)
 */
export function getPool(): Pool {
  if (!pool) throw new Error('Test not initialized. Call initializeTestEnv() first')
  return pool
}

/**
 * Get shared app (must call initializeTestEnv first)
 */
export function getApp(): any {
  if (!app) throw new Error('Test not initialized. Call initializeTestEnv() first')
  return app
}

/**
 * Cleanup: close DB connection (call in afterAll of last test suite)
 */
export async function cleanupTestEnv() {
  if (pool) {
    try {
      await pool.end()
      pool = null
      setupDone = false
      console.log('\n🔌 Test environment cleaned up\n')
    } catch (err) {
      console.warn('Error closing pool:', err)
    }
  }
}

/**
 * Force cleanup on process exit to prevent hanging
 */
process.on('beforeExit', async () => {
  if (pool && !pool.ended) {
    await cleanupTestEnv()
  }
})

/**
 * Cleanup specific records after each test
 */
export async function cleanupRecords(queries: Array<{ table: string; where: Record<string, any> }>) {
  if (!pool) return

  for (const { table, where } of queries) {
    const conditions = Object.entries(where)
      .map(([key, value], index) => `${key} = $${index + 1}`)
      .join(' AND ')
    const values = Object.values(where)

    try {
      await pool.query(`DELETE FROM ${table} WHERE ${conditions}`, values)
    } catch (err) {
      console.warn(`Failed to cleanup ${table}:`, err)
    }
  }
}
