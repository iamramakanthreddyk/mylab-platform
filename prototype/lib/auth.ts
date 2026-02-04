import { User, UserRole } from './types'

export function hasPermission(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  return requiredRoles.includes(user.role)
}

export function canAccessSchema(user: User | null): boolean {
  return hasPermission(user, ['Admin', 'Manager'])
}

export function canManageProjects(user: User | null): boolean {
  return hasPermission(user, ['Admin', 'Manager', 'Scientist'])
}

export function canViewProjects(user: User | null): boolean {
  return hasPermission(user, ['Admin', 'Manager', 'Scientist', 'Viewer'])
}
