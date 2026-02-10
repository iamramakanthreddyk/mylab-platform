/**
 * MyLab Frontend - Central Brain (Single Point of Truth)
 *
 * This file defines the complete frontend architecture, routes, components,
 * and capabilities as a single source of truth.
 */

export interface FrontendModule {
  id: string
  name: string
  description: string
  route: string
  component: string
  icon?: string
  requiresAuth: boolean
  roles: string[]
  subRoutes?: SubRoute[]
}

export interface SubRoute {
  path: string
  component: string
  title: string
}

export interface NavigationItem {
  id: string
  label: string
  route: string
  icon?: string
  children?: NavigationItem[]
}

export interface DashboardWidget {
  id: string
  title: string
  component: string
  size: 'small' | 'medium' | 'large'
  roles: string[]
}

// Frontend Platform Configuration
export const FRONTEND_CONFIG = {
  name: 'MyLab Frontend',
  version: '1.0.0',
  baseUrl: 'http://localhost:5000',
  apiBase: 'http://localhost:3001/api',
  theme: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b'
  },
  navigation: [] as NavigationItem[],
  modules: [] as FrontendModule[],
  dashboardWidgets: [] as DashboardWidget[]
}

// Define navigation structure
const NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    route: '/dashboard',
    icon: 'HomeIcon'
  },
  {
    id: 'projects',
    label: 'Projects',
    route: '/projects',
    icon: 'FolderIcon',
    children: [
      {
        id: 'projects-list',
        label: 'All Projects',
        route: '/projects'
      },
      {
        id: 'projects-create',
        label: 'Create Project',
        route: '/projects/create'
      }
    ]
  },
  {
    id: 'samples',
    label: 'Samples',
    route: '/samples',
    icon: 'BeakerIcon'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    route: '/analytics',
    icon: 'ChartBarIcon'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    route: '/compliance',
    icon: 'ShieldCheckIcon'
  },
  {
    id: 'company',
    label: 'Company',
    route: '/company',
    icon: 'BuildingIcon'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    route: '/integrations',
    icon: 'BoltIcon'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    route: '/marketplace',
    icon: 'ShoppingBagIcon'
  },
  {
    id: 'modules',
    label: 'Modules',
    route: '/modules',
    icon: 'PuzzlePieceIcon'
  },
  {
    id: 'support',
    label: 'Support',
    route: '/support',
    icon: 'QuestionMarkCircleIcon'
  }
]

// Define frontend modules
const MODULES: FrontendModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with overview and widgets',
    route: '/dashboard',
    component: 'Dashboard',
    icon: 'HomeIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist', 'Viewer']
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project management and lifecycle',
    route: '/projects',
    component: 'ProjectsView',
    icon: 'FolderIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist'],
    subRoutes: [
      {
        path: '/create',
        component: 'CreateProjectPage',
        title: 'Create Project'
      },
      {
        path: '/:id',
        component: 'ProjectDetail',
        title: 'Project Details'
      },
      {
        path: '/:id/edit',
        component: 'EditProjectModal',
        title: 'Edit Project'
      }
    ]
  },
  {
    id: 'samples',
    name: 'Samples',
    description: 'Sample tracking and experimental trials management',
    route: '/samples',
    component: 'SamplesView',
    icon: 'BeakerIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'batches',
    name: 'Batches',
    description: 'Analysis batch management and tracking',
    route: '/batches',
    component: 'BatchesView',
    icon: 'CircleStackIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'analyses',
    name: 'Analyses',
    description: 'Analysis results and data management',
    route: '/analyses',
    component: 'AnalysesView',
    icon: 'ChartPieIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Data analysis and reporting',
    route: '/analytics',
    component: 'AnalyticsDashboard',
    icon: 'ChartBarIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager']
  },
  {
    id: 'compliance',
    name: 'Compliance',
    description: 'Regulatory compliance and audit trails',
    route: '/compliance',
    component: 'ComplianceDashboard',
    icon: 'ShieldCheckIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager']
  },
  {
    id: 'company',
    name: 'Company',
    description: 'Company and organization management',
    route: '/company',
    component: 'CompanySettings',
    icon: 'BuildingIcon',
    requiresAuth: true,
    roles: ['Admin']
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'External system integrations',
    route: '/integrations',
    component: 'IntegrationHub',
    icon: 'BoltIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager']
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Service marketplace for external providers',
    route: '/marketplace',
    component: 'Marketplace',
    icon: 'ShoppingBagIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager']
  },
  {
    id: 'modules',
    name: 'Module Center',
    description: 'Module management and configuration',
    route: '/modules',
    component: 'ModuleCenter',
    icon: 'PuzzlePieceIcon',
    requiresAuth: true,
    roles: ['Admin']
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Help and support system',
    route: '/support',
    component: 'SupportCenter',
    icon: 'QuestionMarkCircleIcon',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist', 'Viewer']
  },
  {    id: 'notifications',
    name: 'Notifications',
    description: 'System and payment notifications',
    route: '/notifications',
    component: 'NotificationCenter',
    icon: 'Bell',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Scientist', 'Viewer']
  },
  {    id: 'login',
    name: 'Login',
    description: 'User authentication',
    route: '/login',
    component: 'Login',
    requiresAuth: false,
    roles: []
  }
]

// Define dashboard widgets
const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    id: 'project-stats',
    title: 'Project Statistics',
    component: 'ProjectStatsWidget',
    size: 'medium',
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'recent-samples',
    title: 'Recent Samples',
    component: 'RecentSamplesWidget',
    size: 'large',
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'compliance-status',
    title: 'Compliance Status',
    component: 'ComplianceStatusWidget',
    size: 'small',
    roles: ['Admin', 'Manager']
  },
  {
    id: 'activity-feed',
    title: 'Activity Feed',
    component: 'ActivityFeedWidget',
    size: 'medium',
    roles: ['Admin', 'Manager', 'Scientist', 'Viewer']
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions',
    component: 'QuickActionsWidget',
    size: 'small',
    roles: ['Admin', 'Manager', 'Scientist']
  },
  {
    id: 'payment-notifications',
    title: 'Payment Notifications',
    component: 'PaymentNotificationWidget',
    size: 'medium',
    roles: ['Admin']
  },
  {
    id: 'system-notifications',
    title: 'System Notifications',
    component: 'SystemNotificationWidget',
    size: 'small',
    roles: ['Admin', 'Manager', 'Scientist', 'Viewer']
  }
]

// Initialize configuration
FRONTEND_CONFIG.navigation = NAVIGATION
FRONTEND_CONFIG.modules = MODULES
FRONTEND_CONFIG.dashboardWidgets = DASHBOARD_WIDGETS

// Utility functions
export const getModuleById = (id: string): FrontendModule | undefined => {
  return FRONTEND_CONFIG.modules.find(module => module.id === id)
}

export const getModuleByRoute = (route: string): FrontendModule | undefined => {
  return FRONTEND_CONFIG.modules.find(module => module.route === route)
}

export const getNavigationItem = (id: string): NavigationItem | undefined => {
  const findItem = (items: NavigationItem[]): NavigationItem | undefined => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = findItem(item.children)
        if (found) return found
      }
    }
    return undefined
  }
  return findItem(FRONTEND_CONFIG.navigation)
}

export const getAvailableModules = (userRole?: string): FrontendModule[] => {
  if (!userRole) return FRONTEND_CONFIG.modules.filter(m => !m.requiresAuth)
  return FRONTEND_CONFIG.modules.filter(module =>
    !module.requiresAuth || module.roles.includes(userRole) || module.roles.includes('*')
  )
}

export const getAvailableWidgets = (userRole: string): DashboardWidget[] => {
  return FRONTEND_CONFIG.dashboardWidgets.filter(widget =>
    widget.roles.includes(userRole) || widget.roles.includes('*')
  )
}

export const checkRouteAccess = (route: string, userRole?: string): boolean => {
  const module = getModuleByRoute(route)
  if (!module) return false
  if (!module.requiresAuth) return true
  if (!userRole) return false
  return module.roles.includes(userRole) || module.roles.includes('*')
}

export default FRONTEND_CONFIG