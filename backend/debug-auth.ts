#!/usr/bin/env ts-node
/**
 * Authentication Debug & Fix Script
 * Diagnoses and fixes 401 authorization errors
 */

import axios from 'axios'

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''

async function debugAuth(): Promise<void> {
  console.log('🔐 Authentication Debug Report')
  console.log('=' .repeat(60))
  console.log(`\nAPI Base URL: ${API_BASE}`)
  console.log(`Admin Token Present: ${ADMIN_TOKEN ? '✅ Yes' : '❌ No'}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Test 1: Check if API is reachable
  console.log('\n1️⃣  Testing API Connectivity...')
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 })
    console.log(`   ✅ API is reachable: ${response.status}`)
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      console.log(`   ❌ API is not running at ${API_BASE}`)
      console.log(`   💡 Start the backend: npm run dev`)
    } else {
      console.log(`   ⚠️  API connection issue: ${err.message}`)
    }
    return
  }

  // Test 2: Check unauthorized endpoint without token
  console.log('\n2️⃣  Testing Unauthorized Request (No Token)...')
  try {
    const response = await axios.get(`${API_BASE}/projects`)
    console.log(`   ⚠️  Request succeeded without auth (may be public): ${response.status}`)
  } catch (err: any) {
    if (err.response?.status === 401) {
      console.log(`   ✅ ✅ Got expected 401 Unauthorized without token`)
      console.log(`   Error message: ${err.response.data?.error || 'No error message'}`)
    } else {
      console.log(`   ❌ Got unexpected error: ${err.response?.status || err.message}`)
    }
  }

  // Test 3: Check with admin token
  console.log('\n3️⃣  Testing Authorized Request (With Admin Token)...')
  if (!ADMIN_TOKEN) {
    console.log(`   ⚠️  No admin token provided`)
    console.log(`   💡 Set ADMIN_TOKEN environment variable to test`)
  } else {
    try {
      const response = await axios.get(`${API_BASE}/projects`, {
        headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
      })
      console.log(`   ✅ Request succeeded with token: ${response.status}`)
      console.log(`   ✅ Projects returned: ${response.data?.data?.length || 0}`)
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log(`   ❌ Got 401 even with token - token may be invalid`)
        console.log(`   Error: ${err.response.data?.error}`)
      } else {
        console.log(`   ❌ Error: ${err.response?.status || err.message}`)
      }
    }
  }

  // Test 4: Check organizations endpoint
  console.log('\n4️⃣  Testing Organizations Endpoint...')
  try {
    const response = await axios.get(`${API_BASE}/organizations`, {
      headers: ADMIN_TOKEN ? { 'Authorization': `Bearer ${ADMIN_TOKEN}` } : {}
    })
    console.log(`   ✅ Organizations endpoint works: ${response.data?.data?.length || 0} orgs`)
  } catch (err: any) {
    if (err.response?.status === 401) {
      console.log(`   ❌ Organizations endpoint requires authentication`)
    } else {
      console.log(`   ⚠️  Error: ${err.response?.status || err.message}`)
    }
  }

  // Test 5: Check login endpoint
  console.log('\n5️⃣  Testing Login Endpoint...')
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'wrong-password'
    }, { timeout: 5000 })
    console.log(`   ⚠️  Login succeeded unexpectedly`)
  } catch (err: any) {
    if (err.response?.status === 401 || err.response?.status === 400) {
      console.log(`   ✅ Login endpoint is working (rejects invalid credentials)`)
    } else {
      console.log(`   ⚠️  Status: ${err.response?.status || err.message}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 Summary:')
  console.log('✅ If API is running and reachable')
  console.log('✅ If endpoints require authentication (401 without token)')
  console.log('❌ If frontend gets 401 with valid token')
  console.log('   → Token may be expired or invalid')
  console.log('   → Check token generation on backend')
  console.log('   → Check token validation logic')
  console.log('\n💡 Next Steps:')
  console.log('1. Ensure backend is running: npm run dev')
  console.log('2. Check that user is logged in (authToken in localStorage)')
  console.log('3. Check browser console for error details')
  console.log('4. Check backend logs for 401 reasons')
  console.log('5. Verify Authorization header is being sent')
}

debugAuth().catch(err => {
  console.error('Debug script error:', err)
  process.exit(1)
})
