import { User, UserRole } from './types'

export function hasPermission(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user) return false
  // Normalize role to lowercase for comparison (database stores as lowercase)
  const normalizedUserRole = user.role.toLowerCase()
  const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase())
  return normalizedRequiredRoles.includes(normalizedUserRole)
}

export function canAccessSchema(user: User | null): boolean {
  return hasPermission(user, ['admin', 'manager'])
}

export function canManageProjects(user: User | null): boolean {
  return hasPermission(user, ['admin', 'manager', 'scientist'])
}

export function canViewProjects(user: User | null): boolean {
  return hasPermission(user, ['admin', 'manager', 'scientist', 'viewer'])
}
