import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, FloppyDisk, PencilSimple, UserCheck, UserX, UsersThree } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface UserManagementProps {
  user: User
}

interface WorkspaceUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  deleted_at?: string | null
}

interface ProjectAssignment {
  projectId: string
  projectName: string
  assignedRole: string
}

export function UserManagement({ user }: UserManagementProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showEditUserDialog, setShowEditUserDialog] = useState(false)
  const [showAssignProjectDialog, setShowAssignProjectDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [userProjects, setUserProjects] = useState<ProjectAssignment[]>([])
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'scientist',
    password: ''
  })

  const [editUser, setEditUser] = useState({
    name: '',
    role: ''
  })

  const [projectAssignment, setProjectAssignment] = useState({
    projectId: '',
    assignedRole: 'scientist'
  })

  const isAdmin = user.role === 'admin'

  useEffect(() => {
    fetchUsers()
    if (isAdmin) {
      fetchProjects()
    }
  }, [includeInactive])

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(`/users?includeInactive=${includeInactive}`)
      setUsers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get('/projects')
      setProjects(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const fetchUserProjects = async (userId: string) => {
    try {
      const response = await axiosInstance.get(`/users/${userId}/projects`)
      setUserProjects(response.data || [])
    } catch (error) {
      console.error('Failed to fetch user projects:', error)
      setUserProjects([])
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
        role: newUser.role,
        password: newUser.password || undefined
      })

      toast.success('User created successfully')
      setNewUser({ name: '', email: '', role: 'scientist', password: '' })
      setShowAddUserDialog(false)
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to add user:', error)
      toast.error(error.response?.data?.error || 'Failed to add user')
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser) return

    try {
      await axiosInstance.patch(`/users/${selectedUser.id}`, {
        name: editUser.name || undefined,
        role: editUser.role || undefined
      })

      toast.success('User updated successfully')
      setShowEditUserDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to update user:', error)
      toast.error(error.response?.data?.error || 'Failed to update user')
    }
  }

  const handleToggleUserStatus = async (userId: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await axiosInstance.delete(`/users/${userId}`)
        toast.success('User deactivated successfully')
      } else {
        await axiosInstance.patch(`/users/${userId}/activate`)
        toast.success('User reactivated successfully')
      }
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to toggle user status:', error)
      toast.error(error.response?.data?.error || 'Failed to update user status')
    }
  }

  const handleAssignToProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser || !projectAssignment.projectId) {
      toast.error('Please select a project')
      return
    }

    try {
      await axiosInstance.post(`/projects/${projectAssignment.projectId}/team`, {
        userId: selectedUser.id,
        assignedRole: projectAssignment.assignedRole
      })

      toast.success('User assigned to project successfully')
      setShowAssignProjectDialog(false)
      setProjectAssignment({ projectId: '', assignedRole: 'scientist' })
      if (selectedUser) {
        fetchUserProjects(selectedUser.id)
      }
    } catch (error: any) {
      console.error('Failed to assign user to project:', error)
      toast.error(error.response?.data?.error || 'Failed to assign user to project')
    }
  }

  const handleRemoveFromProject = async (projectId: string, userId: string) => {
    try {
      await axiosInstance.delete(`/projects/${projectId}/team/${userId}`)
      toast.success('User removed from project')
      fetchUserProjects(userId)
    } catch (error: any) {
      console.error('Failed to remove user from project:', error)
      toast.error(error.response?.data?.error || 'Failed to remove user from project')
    }
  }

  const openEditDialog = (user: WorkspaceUser) => {
    setSelectedUser(user)
    setEditUser({
      name: user.name,
      role: user.role
    })
    setShowEditUserDialog(true)
  }

  const openAssignProjectDialog = (user: WorkspaceUser) => {
    setSelectedUser(user)
    fetchUserProjects(user.id)
    setShowAssignProjectDialog(true)
  }

  const activeUsers = users.filter(u => u.is_active)
  const inactiveUsers = users.filter(u => !u.is_active)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">User Management</h1>
              <p className="text-muted-foreground">
                Manage organization users, roles, and project assignments
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setShowAddUserDialog(true)}
              className="gap-2"
            >
              <Plus size={16} />
              Add User
            </Button>
          )}
        </div>

        {/* Filters */}
        {isAdmin && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-inactive"
                    checked={includeInactive}
                    onCheckedChange={setIncludeInactive}
                  />
                  <Label htmlFor="include-inactive">Show inactive users</Label>
                </div>
                <div className="flex-1" />
                <Badge variant="secondary">{activeUsers.length} Active</Badge>
                {inactiveUsers.length > 0 && (
                  <Badge variant="outline">{inactiveUsers.length} Inactive</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users Grid */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
            {isAdmin && includeInactive && (
              <TabsTrigger value="inactive">Inactive Users ({inactiveUsers.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeUsers.map((u) => (
                <Card key={u.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{u.name}</CardTitle>
                        <CardDescription className="text-sm">{u.email}</CardDescription>
                      </div>
                      <Badge variant="default" className="capitalize">{u.role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(u)}
                            className="gap-1 flex-1"
                          >
                            <PencilSimple size={14} />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAssignProjectDialog(u)}
                            className="gap-1 flex-1"
                          >
                            <UsersThree size={14} />
                            Projects
                          </Button>
                          {u.id !== user.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleToggleUserStatus(u.id, true)}
                              className="gap-1"
                            >
                              <UserX size={14} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {isAdmin && includeInactive && (
            <TabsContent value="inactive" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveUsers.map((u) => (
                  <Card key={u.id} className="opacity-60">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{u.name}</CardTitle>
                          <CardDescription className="text-sm">{u.email}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleToggleUserStatus(u.id, false)}
                        className="gap-2 w-full"
                      >
                        <UserCheck size={14} />
                        Reactivate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

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
              Add team members to your organization
            </p>
            {isAdmin && (
              <Button onClick={() => setShowAddUserDialog(true)} className="gap-2">
                <Plus size={16} />
                Add First User
              </Button>
            )}
          </div>
        )}

        {/* Add User Dialog */}
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>Create a new user account in your organization</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
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
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="scientist">Scientist</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty for auto-generated password"
                />
                <p className="text-xs text-muted-foreground">
                  If no password is provided, a temporary password will be generated
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddUserDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <FloppyDisk size={16} />
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and role</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="scientist">Scientist</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditUserDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gap-2">
                  <FloppyDisk size={16} />
                  Update User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assign to Project Dialog */}
        <Dialog open={showAssignProjectDialog} onOpenChange={setShowAssignProjectDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Project Assignments</DialogTitle>
              <DialogDescription>
                Assign user to projects and manage their roles
                {selectedUser && ` - ${selectedUser.name}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Current Assignments */}
              <div>
                <h4 className="font-semibold mb-2">Current Projects</h4>
                {userProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not assigned to any projects yet</p>
                ) : (
                  <div className="space-y-2">
                    {userProjects.map((proj) => (
                      <div key={proj.projectId} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{proj.projectName}</p>
                          <p className="text-sm text-muted-foreground capitalize">{proj.assignedRole}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => selectedUser && handleRemoveFromProject(proj.projectId, selectedUser.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Assignment Form */}
              <form onSubmit={handleAssignToProject} className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Assign to New Project</h4>
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={projectAssignment.projectId}
                    onValueChange={(value) => setProjectAssignment(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.filter(p => !userProjects.some(up => up.projectId === p.id)).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-role">Role in Project</Label>
                  <Select
                    value={projectAssignment.assignedRole}
                    onValueChange={(value) => setProjectAssignment(prev => ({ ...prev, assignedRole: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="scientist">Scientist</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAssignProjectDialog(false)}>
                    Close
                  </Button>
                  <Button type="submit" disabled={!projectAssignment.projectId}>
                    Assign to Project
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
