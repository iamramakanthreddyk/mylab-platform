import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { AlertCircle, LogOut, RefreshCw, Building2, Users, Plus, Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import axiosInstance from '@/lib/axiosConfig'

// Type definitions for Admin Dashboard
interface FrontendOrganization {
  id: string
  name: string
  type: string
  organizationId?: string
  created_at?: string
  gst_number?: string
  gst_percentage?: number
  country?: string
  industry?: string
  company_size?: string
  website?: string
  primary_contact_name?: string
  primary_contact_email?: string
  primary_contact_phone?: string
  subscription_status?: string
  plan_name?: string
  admin_user_id?: string
  admin_user_email?: string
  admin_user_name?: string
  organization_id?: string
  organization_name?: string
  organization_type?: string
}

interface FrontendPlan {
  id: string
  name: string
  tier: string
  description?: string
  price_monthly?: number
  max_users?: number
  max_projects?: number
  max_storage_gb?: number
  is_active?: boolean
  features?: any
  subscription_count?: number
  monthly_revenue?: number
  companies_on_plan?: number
  active_companies?: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
}

interface AdminDashboardProps {
  user: AdminUser
  token: string
  onLogout: () => void
}

export function AdminDashboard({ user, token, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [organizations, setOrganizations] = useState<FrontendOrganization[]>([])
  const [plans, setPlans] = useState<FrontendPlan[]>([])
  const [stats, setStats] = useState({ totalOrgs: 0, activeSubscriptions: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [createOrgForm, setCreateOrgForm] = useState({
    name: '',
    type: 'client',
    email: '',
    password: '',
    admin_name: '',
    gst_number: '',
    gst_percentage: 18,
    country: '',
    industry: '',
    company_size: '',
    website: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    plan_id: ''
  })
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [editingPlan, setEditingPlan] = useState<FrontendPlan | null>(null)
  const [editPlanForm, setEditPlanForm] = useState({
    name: '',
    tier: 'basic',
    description: '',
    price_monthly: 0,
    max_users: 1,
    max_projects: 1,
    max_storage_gb: 1,
    features: {},
    is_active: true
  })
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)
  const [editingOrg, setEditingOrg] = useState<FrontendOrganization | null>(null)
  const [editOrgForm, setEditOrgForm] = useState({
    name: '',
    type: 'client',
    industry: '',
    company_size: '',
    website: '',
    gst_number: '',
    gst_percentage: 18,
    country: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    plan_id: '',
    // Admin creation fields
    create_admin: false,
    admin_email: '',
    admin_password: '',
    admin_name: ''
  })
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false)
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false)
  const [createAdminForm, setCreateAdminForm] = useState({
    email: '',
    password: '',
    name: ''
  })

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    try {
      console.log('📊 Fetching admin dashboard data...')
      
      // Fetch organizations
      console.log('📦 Fetching organizations...')
      const orgsResponse = await axiosInstance.get(`/admin/organizations`)
      console.log('✅ Organizations fetched:', orgsResponse.data)
      console.log('🔍 Organizations being set to state:', orgsResponse.data.organizations || [])
      setOrganizations(orgsResponse.data.organizations || [])
      console.log('📊 Total organizations in response:', (orgsResponse.data.organizations || []).length)
      setStats((prev) => ({ ...prev, totalOrgs: orgsResponse.data.total || 0 }))

      // Fetch plans
      console.log('📋 Fetching plans...')
      const plansResponse = await axiosInstance.get(`/admin/company-plans`)
      console.log('✅ Plans fetched:', plansResponse.data)
      const plansData = plansResponse.data.plans || []
      setPlans(plansData)
      
      console.log('✅ Dashboard data loaded successfully')
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to fetch data'
      console.error('❌ API Error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createOrganization = async () => {
    if (!createOrgForm.name || !createOrgForm.email || !createOrgForm.password) {
      setError('Organization name, admin email, and password are required')
      return
    }

    setIsCreatingOrg(true)
    setError('')

    try {
      console.log('🏢 Creating organization with admin user...')
      const response = await axiosInstance.post('/admin/organizations', createOrgForm)
      console.log('✅ Organization created:', response.data)

      // Reset form
      setCreateOrgForm({
        name: '',
        type: 'client',
        email: '',
        password: '',
        admin_name: '',
        gst_number: '',
        gst_percentage: 18,
        country: '',
        industry: '',
        company_size: '',
        website: '',
        primary_contact_name: '',
        primary_contact_email: '',
        primary_contact_phone: '',
        plan_id: ''
      })

      // Refresh data to show new organization
      await fetchData()

      // Switch to organizations tab
      setActiveTab('organizations')
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create organization'
      console.error('❌ Create organization error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(message)
    } finally {
      setIsCreatingOrg(false)
    }
  }

  const startEditingPlan = (plan: FrontendPlan) => {
    setEditingPlan(plan)
    setEditPlanForm({
      name: plan.name,
      tier: plan.tier || 'basic',
      description: (plan as any).description || '',
      price_monthly: plan.price_monthly || 0,
      max_users: plan.max_users || 1,
      max_projects: plan.max_projects || 1,
      max_storage_gb: plan.max_storage_gb || 1,
      features: (plan as any).features || {},
      is_active: (plan as any).is_active !== undefined ? (plan as any).is_active : true
    })
  }

  const startEditingOrg = (org: FrontendOrganization) => {
    console.log('🔍 Selected organization for editing:', {
      id: org.id,
      organization_id: (org as any).organization_id,
      name: org.name,
      allKeys: Object.keys(org)
    })
    setEditingOrg(org)
    setEditOrgForm({
      name: org.name,
      type: org.type || 'client',
      industry: org.industry || '',
      company_size: org.company_size || '',
      website: org.website || '',
      gst_number: org.gst_number || '',
      gst_percentage: org.gst_percentage || 18,
      country: org.country || '',
      primary_contact_name: org.primary_contact_name || '',
      primary_contact_email: org.primary_contact_email || '',
      primary_contact_phone: org.primary_contact_phone || '',
      plan_id: (org as any).plan_id || '',
      create_admin: false,
      admin_email: '',
      admin_password: '',
      admin_name: `${org.name} Admin`
    })
  }

  const cancelEditingPlan = () => {
    setEditingPlan(null)
    setEditPlanForm({
      name: '',
      tier: 'basic',
      description: '',
      price_monthly: 0,
      max_users: 1,
      max_projects: 1,
      max_storage_gb: 1,
      features: {},
      is_active: true
    })
  }

  const updatePlan = async () => {
    if (!editingPlan) return

    setIsUpdatingPlan(true)
    setError('')

    try {
      console.log('📝 Updating plan:', editingPlan.id)
      const response = await axiosInstance.put(`/admin/plans/${editingPlan.id}`, editPlanForm)
      console.log('✅ Plan updated:', response.data)

      // Refresh data to show updated plan
      await fetchData()
      cancelEditingPlan()
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update plan'
      console.error('❌ Update plan error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(message)
    } finally {
      setIsUpdatingPlan(false)
    }
  }

  const cancelEditingOrg = () => {
    setEditingOrg(null)
    setEditOrgForm({
      name: '',
      type: 'client',
      industry: '',
      company_size: '',
      website: '',
      gst_number: '',
      gst_percentage: 18,
      country: '',
      primary_contact_name: '',
      primary_contact_email: '',
      primary_contact_phone: '',
      plan_id: '',
      create_admin: false,
      admin_email: '',
      admin_password: '',
      admin_name: ''
    })
  }

  const updateOrg = async () => {
    if (!editingOrg) return

    // Validate required fields
    if (!editOrgForm.name || !editOrgForm.type || !editOrgForm.country || !editOrgForm.primary_contact_name || !editOrgForm.primary_contact_email) {
      setError('Missing required fields: name, type, country, primary_contact_name, primary_contact_email')
      return
    }

    setIsUpdatingOrg(true)
    setError('')

    try {
      console.log('� BEFORE UPDATE - Full editingOrg state:', JSON.parse(JSON.stringify(editingOrg)))
      console.log('📝 Updating organization:', {
        id: editingOrg.id,
        organization_id: (editingOrg as any).organization_id,
        name: editingOrg.name,
        url: `/admin/organizations/${editingOrg.id}`,
        CONFIRMING_ID_USED: editingOrg.id
      })
      
      const url = `/admin/organizations/${editingOrg.id}`
      console.log('🌐 About to send PUT request to:', url)
      
      const response = await axiosInstance.put(url, editOrgForm)
      console.log('✅ Organization updated:', response.data)

      const nextPlanId = editOrgForm.plan_id
      const currentPlanId = (editingOrg as any).plan_id || ''

      if (nextPlanId && nextPlanId !== currentPlanId) {
        console.log('💳 Assigning plan:', nextPlanId)
        await axiosInstance.post(`/admin/subscriptions/${editingOrg.id}/upgrade`, { planId: nextPlanId })
      }

      // Refresh data to show updated organization
      await fetchData()
      cancelEditingOrg()
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update organization'
      console.error('❌ Update organization error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(message)
    } finally {
      setIsUpdatingOrg(false)
    }
  }

  const createAdmin = async () => {
    if (!editingOrg) return

    // Validate required fields
    if (!createAdminForm.email || !createAdminForm.password) {
      setError('Email and password are required')
      return
    }

    setIsCreatingAdmin(true)
    setError('')

    try {
      console.log('👤 Creating admin user for organization:', editingOrg.id)
      const response = await axiosInstance.post(
        `/admin/organizations/${editingOrg.id}/create-admin`,
        {
          email: createAdminForm.email,
          password: createAdminForm.password,
          name: createAdminForm.name || `${editingOrg.name} Admin`
        }
      )
      console.log('✅ Admin user created:', response.data)

      // Reset form and refresh data
      setCreateAdminForm({ email: '', password: '', name: '' })
      await fetchData()
      toast.success('Admin user created successfully!')
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create admin user'
      console.error('❌ Create admin error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      setError(message)
      toast.error(message)
    } finally {
      setIsCreatingAdmin(false)
    }
  }

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.gst_number?.includes(searchQuery) ||
      org.country?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  console.log('🎯 Current state:', {
    totalOrganizationsInState: organizations.length,
    filteredOrganizations: filteredOrgs.length,
    organizationIds: organizations.map(o => ({ name: o.name, id: o.id }))
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">⚙️</span> Admin Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">Welcome, {user.email}</p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="flex gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                Total Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{isLoading ? '...' : stats.totalOrgs}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{isLoading ? '...' : plans.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-gray-200">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger
                value="overview"
                className="relative px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="organizations"
                className="relative px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
              >
                Organizations
              </TabsTrigger>
              <TabsTrigger
                value="create-org"
                className="relative px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
              >
                <Plus size={16} className="mr-2" />
                Create Organization
              </TabsTrigger>
              <TabsTrigger
                value="plans"
                className="relative px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none bg-transparent hover:bg-gray-50 transition-colors"
              >
                Plans & Revenue
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-gray-900 text-lg">Platform Overview</CardTitle>
                <CardDescription className="text-gray-600">
                  Key metrics and system information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Admin User</p>
                    <p className="text-gray-900 font-medium">{user.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-4 border border-gray-200">
                    <p className="text-sm text-gray-600">Role</p>
                    <p className="text-gray-900 font-medium capitalize">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-gray-900 text-lg">Organizations</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage companies and their GST information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search by name, GST, or country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                  />
                  <Button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredOrgs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {organizations.length === 0 ? 'No organizations found' : 'No matches'}
                    </p>
                  ) : (
                    filteredOrgs.map((org) => (
                      <div key={org.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900">{org.name}</h3>
                            <p className="text-sm text-gray-500 font-mono">ID: {org.id}</p>
                            <p className="text-sm text-gray-600">{org.industry || 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              org.subscription_status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : org.subscription_status
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {org.subscription_status?.toUpperCase() || 'NO PLAN'}
                            </span>
                            <Button
                              onClick={() => startEditingOrg(org)}
                              variant="outline"
                              size="sm"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <Edit2 size={14} className="mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="text-gray-500">GST:</span> {org.gst_number || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Rate:</span> {org.gst_percentage ? `${org.gst_percentage}%` : 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Plan:</span> {org.plan_name || 'None'}
                          </div>
                          <div>
                            <span className="text-gray-500">Country:</span> {org.country || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-500">Admin:</span> {org.admin_user_email || 'Not set'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Organization Tab */}
          <TabsContent value="create-org" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-gray-900 text-lg">Create New Organization</CardTitle>
                <CardDescription className="text-gray-600">
                  Create a new organization with an admin user who can log in and manage it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <Input
                        value={createOrgForm.name}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter organization name"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Type *
                      </label>
                      <select
                        value={createOrgForm.type}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="client">Client</option>
                        <option value="cro">CRO</option>
                        <option value="analyzer">Analyzer</option>
                        <option value="vendor">Vendor</option>
                        <option value="pharma">Pharma</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Used for documentation and reporting only. Workflow and feature access are controlled by RBAC and plan.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <Input
                        value={createOrgForm.industry}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g., Pharmaceuticals, Biotechnology"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Size
                      </label>
                      <select
                        value={createOrgForm.company_size}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, company_size: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <Input
                        value={createOrgForm.website}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan
                      </label>
                      <select
                        value={createOrgForm.plan_id}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, plan_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No plan (trial)</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id} disabled={plan.is_active === false}>
                            {plan.name} ({plan.tier})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select a plan to activate immediately or leave empty to keep the organization on trial.
                      </p>
                    </div>
                  </div>

                  {/* Admin User Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Admin User Account</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Email *
                      </label>
                      <Input
                        type="email"
                        value={createOrgForm.email}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="admin@organization.com"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Password *
                      </label>
                      <Input
                        type="password"
                        value={createOrgForm.password}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter secure password"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Name
                      </label>
                      <Input
                        value={createOrgForm.admin_name}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, admin_name: e.target.value }))}
                        placeholder="Full name of admin user"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Primary Contact</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Name
                      </label>
                      <Input
                        value={createOrgForm.primary_contact_name}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, primary_contact_name: e.target.value }))}
                        placeholder="Contact person name"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Email
                      </label>
                      <Input
                        type="email"
                        value={createOrgForm.primary_contact_email}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, primary_contact_email: e.target.value }))}
                        placeholder="contact@company.com"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Phone
                      </label>
                      <Input
                        value={createOrgForm.primary_contact_phone}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, primary_contact_phone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Tax Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Tax & Location Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <Input
                        value={createOrgForm.gst_number}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, gst_number: e.target.value }))}
                        placeholder="29AABCT1234H1Q2"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Percentage
                      </label>
                      <Input
                        type="number"
                        value={createOrgForm.gst_percentage}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 18 }))}
                        placeholder="18"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <Input
                        value={createOrgForm.country}
                        onChange={(e) => setCreateOrgForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="India"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={createOrganization}
                    disabled={isCreatingOrg}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isCreatingOrg ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Create Organization
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-gray-900 text-lg">Plans & Revenue</CardTitle>
                <CardDescription className="text-gray-600">
                  Company distribution and revenue by plan tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plans.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No plans found</p>
                  ) : (
                    plans.map((plan) => (
                      <div key={plan.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {editingPlan?.id === plan.id ? (
                          // Edit Mode
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="font-semibold text-gray-900">Edit Plan</h3>
                              <div className="flex gap-2">
                                <Button
                                  onClick={updatePlan}
                                  disabled={isUpdatingPlan}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  {isUpdatingPlan ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                  ) : (
                                    <Save size={14} />
                                  )}
                                </Button>
                                <Button
                                  onClick={cancelEditingPlan}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300"
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Plan Name
                                </label>
                                <Input
                                  value={editPlanForm.name}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tier
                                </label>
                                <select
                                  value={editPlanForm.tier}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, tier: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                >
                                  <option value="basic">Basic</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                  <option value="custom">Custom</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Monthly Price (₹)
                                </label>
                                <Input
                                  type="number"
                                  value={editPlanForm.price_monthly}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, price_monthly: parseInt(e.target.value) || 0 }))}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max Users
                                </label>
                                <Input
                                  type="number"
                                  value={editPlanForm.max_users}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, max_users: parseInt(e.target.value) || 1 }))}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max Projects
                                </label>
                                <Input
                                  type="number"
                                  value={editPlanForm.max_projects}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, max_projects: parseInt(e.target.value) || 1 }))}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Max Storage (GB)
                                </label>
                                <Input
                                  type="number"
                                  value={editPlanForm.max_storage_gb}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, max_storage_gb: parseInt(e.target.value) || 1 }))}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  value={editPlanForm.description}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, description: e.target.value }))}
                                  rows={3}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                                  placeholder="Plan description..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Features (JSON)
                                </label>
                                <textarea
                                  value={JSON.stringify(editPlanForm.features, null, 2)}
                                  onChange={(e) => {
                                    try {
                                      const parsed = JSON.parse(e.target.value);
                                      setEditPlanForm(prev => ({ ...prev, features: parsed }));
                                    } catch {
                                      // Invalid JSON, keep as string for now
                                    }
                                  }}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 font-mono text-sm"
                                  placeholder='{"feature1": true, "feature2": "value"}'
                                />
                              </div>

                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  id="is_active"
                                  checked={editPlanForm.is_active}
                                  onChange={(e) => setEditPlanForm(prev => ({ ...prev, is_active: e.target.checked }))}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                                  Plan is active
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                <p className="text-xs text-gray-600 mt-1">{plan.tier?.toUpperCase() || 'STANDARD'} • {(plan as any).is_active !== false ? 'Active' : 'Inactive'}</p>
                                {(plan as any).description && (
                                  <p className="text-sm text-gray-700 mt-2">{(plan as any).description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600">₹{(plan.monthly_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                  <p className="text-xs text-gray-600">monthly revenue</p>
                                </div>
                                <Button
                                  onClick={() => startEditingPlan(plan)}
                                  variant="outline"
                                  size="sm"
                                  className="border-gray-300 hover:bg-gray-50"
                                >
                                  <Edit2 size={14} />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Price/Month</p>
                                <p className="font-semibold text-gray-900">₹{(plan.price_monthly || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Max Users</p>
                                <p className="font-semibold text-gray-900">{plan.max_users || 'Unlimited'}</p>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Max Projects</p>
                                <p className="font-semibold text-gray-900">{plan.max_projects || 'Unlimited'}</p>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Max Storage</p>
                                <p className="font-semibold text-gray-900">{plan.max_storage_gb || 'Unlimited'} GB</p>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Companies</p>
                                <p className="font-semibold text-gray-900">{plan.companies_on_plan || 0}</p>
                              </div>
                              <div className="bg-white rounded p-2 border border-gray-200">
                                <p className="text-gray-600 text-xs">Active</p>
                                <p className="font-semibold text-gray-900">{plan.active_companies || 0}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Organization Modal */}
        {editingOrg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Organization: {editingOrg.name}
                </h3>
                <Button
                  onClick={cancelEditingOrg}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">Basic Information</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Name *
                      </label>
                      <Input
                        value={editOrgForm.name}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter organization name"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Organization Type *
                      </label>
                      <select
                        value={editOrgForm.type}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="client">Client</option>
                        <option value="cro">CRO</option>
                        <option value="analyzer">Analyzer</option>
                        <option value="vendor">Vendor</option>
                        <option value="pharma">Pharma</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Used for documentation and reporting only. Workflow and feature access are controlled by RBAC and plan.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industry
                      </label>
                      <Input
                        value={editOrgForm.industry}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g., Pharmaceuticals, Biotechnology"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Size
                      </label>
                      <select
                        value={editOrgForm.company_size}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, company_size: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <Input
                        value={editOrgForm.website}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plan
                      </label>
                      <select
                        value={editOrgForm.plan_id}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, plan_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">No plan (trial)</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id} disabled={plan.is_active === false}>
                            {plan.name} ({plan.tier})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select a plan to activate or change subscription.
                      </p>
                    </div>
                  </div>

                  {/* Tax & Location Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900">Tax & Location Information</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <Input
                        value={editOrgForm.gst_number}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, gst_number: e.target.value }))}
                        placeholder="22AAAAA0000A1Z5"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Percentage
                      </label>
                      <Input
                        type="number"
                        value={editOrgForm.gst_percentage}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, gst_percentage: parseInt(e.target.value) || 0 }))}
                        placeholder="18"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <Input
                        value={editOrgForm.country}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="India"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Name *
                      </label>
                      <Input
                        value={editOrgForm.primary_contact_name}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, primary_contact_name: e.target.value }))}
                        placeholder="John Doe"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Email *
                      </label>
                      <Input
                        type="email"
                        value={editOrgForm.primary_contact_email}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, primary_contact_email: e.target.value }))}
                        placeholder="john.doe@company.com"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Contact Phone
                      </label>
                      <Input
                        value={editOrgForm.primary_contact_phone}
                        onChange={(e) => setEditOrgForm(prev => ({ ...prev, primary_contact_phone: e.target.value }))}
                        placeholder="+91 9876543210"
                        className="bg-white border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Current Admin */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Current Admin</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
                      <Input
                        value={(editingOrg as any).admin_user_name || ''}
                        placeholder="Not set"
                        className="bg-white border-gray-300 text-gray-900"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                      <Input
                        value={(editingOrg as any).admin_user_email || ''}
                        placeholder="Not set"
                        className="bg-white border-gray-300 text-gray-900"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Admin ID</label>
                      <Input
                        value={(editingOrg as any).admin_user_id || ''}
                        placeholder="Not set"
                        className="bg-white border-gray-300 text-gray-900"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Create Admin User Section - If No Admin Exists */}
                {!(editingOrg as any).admin_user_id && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Admin User</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        No admin user is currently assigned to this organization. Create one to manage this workspace.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={createAdminForm.email}
                          onChange={(e) => setCreateAdminForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="admin@company.com"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isCreatingAdmin}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password *
                        </label>
                        <Input
                          type="password"
                          value={createAdminForm.password}
                          onChange={(e) => setCreateAdminForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Secure password"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isCreatingAdmin}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name (Optional)
                        </label>
                        <Input
                          type="text"
                          value={createAdminForm.name}
                          onChange={(e) => setCreateAdminForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Admin Name"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isCreatingAdmin}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                      <Button
                        onClick={createAdmin}
                        disabled={isCreatingAdmin || !createAdminForm.email || !createAdminForm.password}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isCreatingAdmin ? (
                          <>
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus size={16} className="mr-2" />
                            Create Admin User
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Legacy Admin Creation on Org Creation */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="create_admin"
                      checked={editOrgForm.create_admin}
                      onChange={(e) => setEditOrgForm(prev => ({ ...prev, create_admin: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="create_admin" className="ml-2 text-sm font-medium text-gray-700">
                      Create Admin User During Organization Creation
                    </label>
                  </div>

                  {editOrgForm.create_admin && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Email *
                        </label>
                        <Input
                          type="email"
                          value={editOrgForm.admin_email}
                          onChange={(e) => setEditOrgForm(prev => ({ ...prev, admin_email: e.target.value }))}
                          placeholder="admin@company.com"
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Password *
                        </label>
                        <Input
                          type="password"
                          value={editOrgForm.admin_password}
                          onChange={(e) => setEditOrgForm(prev => ({ ...prev, admin_password: e.target.value }))}
                          placeholder="Secure password"
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Admin Name
                        </label>
                        <Input
                          value={editOrgForm.admin_name}
                          onChange={(e) => setEditOrgForm(prev => ({ ...prev, admin_name: e.target.value }))}
                          placeholder="Admin User Name"
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
                  <Button
                    onClick={cancelEditingOrg}
                    variant="outline"
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={updateOrg}
                    disabled={isUpdatingOrg}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isUpdatingOrg ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Update Organization
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
