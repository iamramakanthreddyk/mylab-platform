import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { AlertCircle, LogOut, RefreshCw, Building2, BarChart3, Users } from 'lucide-react'
import axiosInstance from '@/lib/axiosConfig'

interface AdminUser {
  id: string
  email: string
  role: string
}

interface Organization {
  id: string
  name: string
  gst_number?: string
  gst_percentage?: number
  country?: string
  industry?: string
  plan_name?: string
  subscription_status?: string
  created_at?: string
}

interface Plan {
  id: string
  name: string
  tier: string
  price_monthly: number
  companies_on_plan: number
  active_companies: number
  monthly_revenue: number
}

interface AdminDashboardProps {
  user: AdminUser
  token: string
  onLogout: () => void
}

export function AdminDashboard({ user, token, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState({ totalOrgs: 0, totalRevenue: 0, activeSubscriptions: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Fetch organizations
      const orgsResponse = await axiosInstance.get(`/admin/organizations`)
      setOrganizations(orgsResponse.data.organizations)
      setStats((prev) => ({ ...prev, totalOrgs: orgsResponse.data.total }))

      // Fetch plans
      const plansResponse = await axiosInstance.get(`/admin/company-plans`)
      setPlans(plansResponse.data.plans)
      
      // Calculate total revenue
      const totalRevenue = plansResponse.data.plans.reduce(
        (sum: number, plan: Plan) => sum + (plan.monthly_revenue || 0),
        0
      )
      setStats((prev) => ({ ...prev, totalRevenue }))
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Failed to fetch data'
      console.error('API Error:', err.response?.status, err.response?.data)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.gst_number?.includes(searchQuery) ||
      org.country?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">⚙️</span> Admin Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">Welcome, {user.email}</p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="flex gap-2 p-4 bg-red-900/30 border border-red-700 rounded-lg mb-6">
            <AlertCircle size={20} className="text-red-400 shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Building2 size={18} className="text-blue-400" />
                Total Organizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{stats.totalOrgs}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <BarChart3 size={18} className="text-green-400" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Users size={18} className="text-purple-400" />
                Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">{plans.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="organizations" className="text-slate-300 data-[state=active]:text-white">
              Organizations
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-slate-300 data-[state=active]:text-white">
              Plans & Revenue
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Platform Overview</CardTitle>
                <CardDescription className="text-slate-400">
                  Key metrics and system information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded p-4">
                    <p className="text-sm text-slate-400">Admin User</p>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded p-4">
                    <p className="text-sm text-slate-400">Role</p>
                    <p className="text-white font-medium capitalize">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Organizations</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage companies and their GST information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search by name, GST, or country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                  </Button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredOrgs.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">
                      {organizations.length === 0 ? 'No organizations found' : 'No matches'}
                    </p>
                  ) : (
                    filteredOrgs.map((org) => (
                      <div key={org.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-white">{org.name}</h3>
                            <p className="text-sm text-slate-400">{org.industry || 'N/A'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            org.subscription_status === 'active'
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-yellow-900/50 text-yellow-300'
                          }`}>
                            {org.subscription_status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                          <div>
                            <span className="text-slate-500">GST:</span> {org.gst_number || 'N/A'}
                          </div>
                          <div>
                            <span className="text-slate-500">Rate:</span> {org.gst_percentage || 0}%
                          </div>
                          <div>
                            <span className="text-slate-500">Plan:</span> {org.plan_name || 'None'}
                          </div>
                          <div>
                            <span className="text-slate-500">Country:</span> {org.country || 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Plans & Revenue</CardTitle>
                <CardDescription className="text-slate-400">
                  Company distribution and revenue by plan tier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plans.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No plans found</p>
                  ) : (
                    plans.map((plan) => (
                      <div key={plan.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-white">{plan.name}</h3>
                            <p className="text-xs text-slate-400 mt-1">{plan.tier.toUpperCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-400">₹{plan.monthly_revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-slate-400">monthly revenue</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="bg-slate-600/50 rounded p-2">
                            <p className="text-slate-400 text-xs">Price/Month</p>
                            <p className="font-semibold text-white">₹{plan.price_monthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                          </div>
                          <div className="bg-slate-600/50 rounded p-2">
                            <p className="text-slate-400 text-xs">Companies</p>
                            <p className="font-semibold text-white">{plan.companies_on_plan}</p>
                          </div>
                          <div className="bg-slate-600/50 rounded p-2">
                            <p className="text-slate-400 text-xs">Active</p>
                            <p className="font-semibold text-white">{plan.active_companies}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
