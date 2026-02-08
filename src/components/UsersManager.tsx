import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, ProjectStage } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface UsersManagerProps {
  user: User
}

interface WorkspaceUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

export function UsersManager({ user }: UsersManagerProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'Scientist'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users')
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error('Name and email are required')
      return
    }

    try {
      await axiosInstance.post('/users', {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role
      })

      toast.success('User added successfully')
      setNewUser({ name: '', email: '', role: 'Scientist' })
      setShowAddUser(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to add user:', error)
      toast.error(error.response?.data?.error || 'Failed to add user')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Users & Team Management</h1>
            <p className="text-muted-foreground">
              Manage workspace users who can perform experiments and trials
            </p>
          </div>
          <Button 
            onClick={() => setShowAddUser(true)}
            className="gap-2"
          >
            <Plus size={16} />
            Add User
          </Button>
        </div>

        {/* Add User Form */}
        {showAddUser && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
              <CardDescription>Add a team member who can perform experiments</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Scientist">Scientist</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2">
                    <FloppyDisk size={16} />
                    Add User
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowAddUser(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{user.role}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        )}

        {!isLoading && users.length === 0 && (
          <div className="text-center py-16">
            <Plus size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              Add team members who can perform experiments and trials
            </p>
            <Button onClick={() => setShowAddUser(true)} className="gap-2">
              <Plus size={16} />
              Add First User
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}