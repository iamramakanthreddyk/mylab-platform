/**
 * Jest Global Teardown - runs once after all test suites
 * Note: This is imported by jest.config.js
 */

export default async function () {
  // Import and cleanup the test environment
  try {
    const setupModule = await import('./_setup')
    if (setupModule.cleanupTestEnv) {
      await setupModule.cleanupTestEnv()
    }
  } catch (err) {
    console.error('Failed to cleanup test environment:', err)
  }
}
