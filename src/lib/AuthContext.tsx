import { createContext, useContext, ReactNode } from 'react'
import { User } from './types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export interface AuthContextProviderProps {
  children: ReactNode
  value: AuthContextType
}

export function AuthContextProvider({ children, value }: AuthContextProviderProps) {
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider')
  }
  return context
}

export function useAuthUser(): User {
  const { user } = useAuth()
  if (!user) {
    throw new Error('User not authenticated')
  }
  return user
}
