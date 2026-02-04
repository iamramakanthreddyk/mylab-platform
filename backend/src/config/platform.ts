/**
 * MyLab Platform - Central Brain (Single Point of Truth)
 *
 * This file defines the complete architecture, modules, APIs, and capabilities
 * of the MyLab platform as a single source of truth.
 */

export interface PlatformModule {
  id: string
  name: string
  description: string
  apiBase: string
  endpoints: ApiEndpoint[]
  components: Component[]
  permissions: Permission[]
  databaseTables: string[]
}

export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  requiresAuth: boolean
  roles: string[]
}

export interface Component {
  name: string
  type: 'page' | 'modal' | 'widget' | 'form'
  route?: string
  description: string
}

export interface Permission {
  action: string
  resource: string
  roles: string[]
}

export interface DatabaseTable {
  name: string
  description: string
  columns: string[]
  relationships: string[]
}

// Core Platform Configuration
export const PLATFORM_CONFIG = {
  name: 'MyLab',
  version: '1.0.0',
  description: 'Secure lab sample lifecycle management platform',
  baseUrl: 'http://localhost:3001/api',
  database: {
    type: 'PostgreSQL',
    version: '15+',
    schema: 'mylab'
  },
  authentication: {
    provider: 'JWT',
    userRoles: ['Admin', 'Manager', 'Scientist', 'Viewer'],
    workspaceIsolation: true
  },
  companyOnboarding: {
    initiationMethods: ['self_signup', 'admin_invitation', 'partner_referral'],
    approvalRequired: true,
    defaultPlan: 'starter',
    welcomeEmailTemplate: 'company_welcome',
    setupSteps: [
      'company_info',
      'workspace_creation',
      'admin_user_setup',
      'billing_setup',
      'initial_configuration'
    ]
  },
  modules: [] as PlatformModule[]
}

// Define all platform modules
const MODULES: PlatformModule[] = [
  {
    id: 'auth',
    name: 'Authentication',
    description: 'User authentication and authorization',
    apiBase: '/auth',
    endpoints: [
      {
        path: '/login',
        method: 'POST',
        description: 'User login',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/logout',
        method: 'POST',
        description: 'User logout',
        requiresAuth: true,
        roles: ['*']
      },
      {
        path: '/me',
        method: 'GET',
        description: 'Get current user info',
        requiresAuth: true,
        roles: ['*']
      }
    ],
    components: [
      {
        name: 'Login',
        type: 'page',
        route: '/login',
        description: 'Login form component'
      },
      {
        name: 'UserProfile',
        type: 'modal',
        description: 'User profile modal'
      }
    ],
    permissions: [
      {
        action: 'login',
        resource: 'auth',
        roles: ['*']
      },
      {
        action: 'view_profile',
        resource: 'user',
        roles: ['*']
      }
    ],
    databaseTables: ['Users']
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management and lifecycle',
    apiBase: '/projects',
    endpoints: [
      {
        path: '/',
        method: 'GET',
        description: 'List projects',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        path: '/',
        method: 'POST',
        description: 'Create project',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/:id',
        method: 'GET',
        description: 'Get project details',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        path: '/:id',
        method: 'PUT',
        description: 'Update project',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/:id/lineage',
        method: 'GET',
        description: 'Get project sample lineage',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      }
    ],
    components: [
      {
        name: 'ProjectsView',
        type: 'page',
        route: '/projects',
        description: 'Projects list and management'
      },
      {
        name: 'ProjectCard',
        type: 'widget',
        description: 'Project summary card'
      },
      {
        name: 'CreateProjectModal',
        type: 'modal',
        description: 'Create new project form'
      }
    ],
    permissions: [
      {
        action: 'create',
        resource: 'project',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'read',
        resource: 'project',
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        action: 'update',
        resource: 'project',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'delete',
        resource: 'project',
        roles: ['Admin']
      }
    ],
    databaseTables: ['Projects', 'ProjectStages']
  },
  {
    id: 'samples',
    name: 'Samples',
    description: 'Sample tracking and management',
    apiBase: '/samples',
    endpoints: [
      {
        path: '/',
        method: 'GET',
        description: 'List samples',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        path: '/',
        method: 'POST',
        description: 'Create sample',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        path: '/:id',
        method: 'GET',
        description: 'Get sample details',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        path: '/:id/lineage',
        method: 'GET',
        description: 'Get sample lineage',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      }
    ],
    components: [
      {
        name: 'SamplesView',
        type: 'page',
        route: '/samples',
        description: 'Samples list and management'
      },
      {
        name: 'SampleCard',
        type: 'widget',
        description: 'Sample summary card'
      },
      {
        name: 'LineageGraph',
        type: 'widget',
        description: 'Sample lineage visualization'
      }
    ],
    permissions: [
      {
        action: 'create',
        resource: 'sample',
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        action: 'read',
        resource: 'sample',
        roles: ['Admin', 'Manager', 'Scientist']
      },
      {
        action: 'update',
        resource: 'sample',
        roles: ['Admin', 'Manager']
      }
    ],
    databaseTables: ['Samples', 'DerivedSamples', 'SampleLineage']
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Data analysis and reporting',
    apiBase: '/analytics',
    endpoints: [
      {
        path: '/dashboard',
        method: 'GET',
        description: 'Get analytics dashboard data',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/reports',
        method: 'GET',
        description: 'List available reports',
        requiresAuth: true,
        roles: ['Admin', 'Manager', 'Scientist']
      }
    ],
    components: [
      {
        name: 'AnalyticsDashboard',
        type: 'page',
        route: '/analytics',
        description: 'Analytics dashboard'
      },
      {
        name: 'ReportViewer',
        type: 'widget',
        description: 'Report display component'
      }
    ],
    permissions: [
      {
        action: 'view',
        resource: 'analytics',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'generate',
        resource: 'report',
        roles: ['Admin', 'Manager']
      }
    ],
    databaseTables: ['Analyses', 'AnalysisTypes']
  },
  {
    id: 'compliance',
    name: 'Compliance',
    description: 'Regulatory compliance and audit trails',
    apiBase: '/compliance',
    endpoints: [
      {
        path: '/audit-log',
        method: 'GET',
        description: 'Get audit log entries',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/reports',
        method: 'GET',
        description: 'Compliance reports',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      }
    ],
    components: [
      {
        name: 'ComplianceDashboard',
        type: 'page',
        route: '/compliance',
        description: 'Compliance monitoring dashboard'
      },
      {
        name: 'AuditLogViewer',
        type: 'widget',
        description: 'Audit log display'
      }
    ],
    permissions: [
      {
        action: 'view',
        resource: 'audit_log',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'export',
        resource: 'compliance_report',
        roles: ['Admin']
      }
    ],
    databaseTables: ['AuditLog']
  },
  {
    id: 'company',
    name: 'Company Management',
    description: 'Company onboarding, management, and administration',
    apiBase: '/company',
    endpoints: [
      // Company Onboarding
      {
        path: '/onboard',
        method: 'POST',
        description: 'Initiate company onboarding (self-signup)',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/onboard/:token',
        method: 'GET',
        description: 'Get onboarding details by token',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/onboard/:token',
        method: 'POST',
        description: 'Complete company onboarding',
        requiresAuth: false,
        roles: []
      },
      // Payment Processing
      {
        path: '/payments/initiate',
        method: 'POST',
        description: 'Initiate payment for company onboarding',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/payments/:paymentId/status',
        method: 'GET',
        description: 'Check payment status',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/payments/:paymentId/verify',
        method: 'POST',
        description: 'Verify offline payment completion (admin)',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/payments/:paymentId/receipt',
        method: 'GET',
        description: 'Get payment receipt',
        requiresAuth: true,
        roles: ['PlatformAdmin', 'OrgAdmin']
      },
      // Payment Management
      {
        path: '/payments/send-reminder',
        method: 'POST',
        description: 'Send payment reminder to workspace',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/workspaces/payment-status',
        method: 'GET',
        description: 'Get workspaces with payment issues',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      // Company Management (Admin)
      {
        path: '/organizations',
        method: 'GET',
        description: 'List all organizations',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/organizations',
        method: 'POST',
        description: 'Create organization (admin only)',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/organizations/:id',
        method: 'GET',
        description: 'Get organization details',
        requiresAuth: true,
        roles: ['PlatformAdmin', 'OrgAdmin']
      },
      {
        path: '/organizations/:id',
        method: 'PUT',
        description: 'Update organization',
        requiresAuth: true,
        roles: ['PlatformAdmin', 'OrgAdmin']
      },
      {
        path: '/organizations/:id/status',
        method: 'PUT',
        description: 'Update organization status (activate/suspend)',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      // Workspace Management
      {
        path: '/workspaces',
        method: 'GET',
        description: 'List workspaces',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/workspaces',
        method: 'POST',
        description: 'Create workspace',
        requiresAuth: true,
        roles: ['PlatformAdmin']
      },
      {
        path: '/workspaces/:id',
        method: 'GET',
        description: 'Get workspace details',
        requiresAuth: true,
        roles: ['PlatformAdmin', 'WorkspaceAdmin']
      },
      // User Invitations
      {
        path: '/invitations',
        method: 'POST',
        description: 'Send user invitation',
        requiresAuth: true,
        roles: ['OrgAdmin', 'WorkspaceAdmin']
      },
      {
        path: '/invitations/:token',
        method: 'GET',
        description: 'Get invitation details',
        requiresAuth: false,
        roles: []
      },
      {
        path: '/invitations/:token/accept',
        method: 'POST',
        description: 'Accept user invitation',
        requiresAuth: false,
        roles: []
      }
    ],
    components: [
      {
        name: 'CompanyOnboarding',
        type: 'page',
        route: '/onboard',
        description: 'Company self-signup onboarding flow'
      },
      {
        name: 'CompanyDashboard',
        type: 'page',
        route: '/company',
        description: 'Company management dashboard'
      },
      {
        name: 'OrganizationManager',
        type: 'page',
        route: '/company/organizations',
        description: 'Platform admin organization management'
      },
      {
        name: 'WorkspaceManager',
        type: 'page',
        route: '/company/workspaces',
        description: 'Workspace administration'
      },
      {
        name: 'UserInvitations',
        type: 'modal',
        description: 'Send user invitations'
      },
      {
        name: 'OnboardingWizard',
        type: 'modal',
        description: 'Step-by-step company setup'
      }
    ],
    permissions: [
      // Platform Admin permissions
      {
        action: 'create',
        resource: 'organization',
        roles: ['PlatformAdmin']
      },
      {
        action: 'manage',
        resource: 'organization',
        roles: ['PlatformAdmin']
      },
      {
        action: 'suspend',
        resource: 'organization',
        roles: ['PlatformAdmin']
      },
      {
        action: 'create',
        resource: 'workspace',
        roles: ['PlatformAdmin']
      },
      {
        action: 'manage',
        resource: 'workspace',
        roles: ['PlatformAdmin']
      },
      // Organization Admin permissions
      {
        action: 'manage',
        resource: 'own_organization',
        roles: ['OrgAdmin']
      },
      {
        action: 'invite',
        resource: 'users',
        roles: ['OrgAdmin', 'WorkspaceAdmin']
      },
      // Payment permissions
      {
        action: 'initiate',
        resource: 'payment',
        roles: ['*'] // Anyone can initiate payment
      },
      {
        action: 'verify',
        resource: 'payment',
        roles: ['PlatformAdmin']
      },
      {
        action: 'view',
        resource: 'payment_receipt',
        roles: ['PlatformAdmin', 'OrgAdmin']
      },
      {
        action: 'send',
        resource: 'payment_reminder',
        roles: ['PlatformAdmin']
      },
      {
        action: 'view',
        resource: 'payment_status',
        roles: ['PlatformAdmin']
      },
      // Self-service permissions
      {
        action: 'onboard',
        resource: 'company',
        roles: ['*'] // Anyone can initiate onboarding
      }
    ],
    databaseTables: ['Organizations', 'Workspace', 'CompanyOnboarding', 'UserInvitations', 'CompanyPayments']
  },
  {
    id: 'integration',
    name: 'Integrations',
    description: 'External system integrations',
    apiBase: '/integration',
    endpoints: [
      {
        path: '/connectors',
        method: 'GET',
        description: 'List available connectors',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/webhooks',
        method: 'POST',
        description: 'Handle webhook events',
        requiresAuth: false,
        roles: []
      }
    ],
    components: [
      {
        name: 'IntegrationHub',
        type: 'page',
        route: '/integrations',
        description: 'Integration management interface'
      },
      {
        name: 'ConnectorConfig',
        type: 'modal',
        description: 'Connector configuration modal'
      }
    ],
    permissions: [
      {
        action: 'configure',
        resource: 'integration',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'view',
        resource: 'integration',
        roles: ['Admin', 'Manager', 'Scientist']
      }
    ],
    databaseTables: [] // Integration configs might be in separate tables
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Service marketplace for external providers',
    apiBase: '/marketplace',
    endpoints: [
      {
        path: '/services',
        method: 'GET',
        description: 'List available services',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      },
      {
        path: '/orders',
        method: 'POST',
        description: 'Place service order',
        requiresAuth: true,
        roles: ['Admin', 'Manager']
      }
    ],
    components: [
      {
        name: 'Marketplace',
        type: 'page',
        route: '/marketplace',
        description: 'Service marketplace interface'
      },
      {
        name: 'ServiceCard',
        type: 'widget',
        description: 'Service offering card'
      }
    ],
    permissions: [
      {
        action: 'browse',
        resource: 'marketplace',
        roles: ['Admin', 'Manager']
      },
      {
        action: 'purchase',
        resource: 'service',
        roles: ['Admin']
      }
    ],
    databaseTables: [] // Marketplace data might be external
  },
  {
    id: 'module',
    name: 'Module Center',
    description: 'Module management and configuration',
    apiBase: '/module',
    endpoints: [
      {
        path: '/modules',
        method: 'GET',
        description: 'List available modules',
        requiresAuth: true,
        roles: ['Admin']
      },
      {
        path: '/modules/:id/config',
        method: 'PUT',
        description: 'Update module configuration',
        requiresAuth: true,
        roles: ['Admin']
      }
    ],
    components: [
      {
        name: 'ModuleCenter',
        type: 'page',
        route: '/modules',
        description: 'Module management interface'
      },
      {
        name: 'ModuleConfig',
        type: 'modal',
        description: 'Module configuration modal'
      }
    ],
    permissions: [
      {
        action: 'configure',
        resource: 'module',
        roles: ['Admin']
      },
      {
        action: 'view',
        resource: 'module',
        roles: ['Admin', 'Manager']
      }
    ],
    databaseTables: [] // Module configs
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Help and support system',
    apiBase: '/support',
    endpoints: [
      {
        path: '/tickets',
        method: 'GET',
        description: 'List support tickets',
        requiresAuth: true,
        roles: ['*']
      },
      {
        path: '/tickets',
        method: 'POST',
        description: 'Create support ticket',
        requiresAuth: true,
        roles: ['*']
      }
    ],
    components: [
      {
        name: 'SupportCenter',
        type: 'page',
        route: '/support',
        description: 'Support ticket interface'
      },
      {
        name: 'TicketForm',
        type: 'modal',
        description: 'Create ticket form'
      }
    ],
    permissions: [
      {
        action: 'create',
        resource: 'ticket',
        roles: ['*']
      },
      {
        action: 'view',
        resource: 'ticket',
        roles: ['*']
      }
    ],
    databaseTables: [] // Support tickets might be external
  }
]

// Initialize modules
PLATFORM_CONFIG.modules = MODULES

// Utility functions
export const getModuleById = (id: string): PlatformModule | undefined => {
  return PLATFORM_CONFIG.modules.find(module => module.id === id)
}

export const getAllEndpoints = (): ApiEndpoint[] => {
  return PLATFORM_CONFIG.modules.flatMap(module => module.endpoints)
}

export const getAllComponents = (): Component[] => {
  return PLATFORM_CONFIG.modules.flatMap(module => module.components)
}

export const getAllPermissions = (): Permission[] => {
  return PLATFORM_CONFIG.modules.flatMap(module => module.permissions)
}

export const getAllDatabaseTables = (): string[] => {
  const tables = new Set<string>()
  PLATFORM_CONFIG.modules.forEach(module => {
    module.databaseTables.forEach(table => tables.add(table))
  })
  return Array.from(tables)
}

export const checkPermission = (userRole: string, action: string, resource: string): boolean => {
  const permissions = getAllPermissions()
  return permissions.some(perm =>
    perm.action === action &&
    perm.resource === resource &&
    (perm.roles.includes('*') || perm.roles.includes(userRole))
  )
}

export default PLATFORM_CONFIG