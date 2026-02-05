import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { User, Project, Organization } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderOpen, Plus, MagnifyingGlass, Calendar, Trash, Pencil } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { canManageProjects } from '@/lib/auth'

interface ProjectsViewProps {
  user: User
  projects: Project[]
  onProjectsChange: (projects: Project[]) => void
}

export function ProjectsView({ user, projects, onProjectsChange }: ProjectsViewProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [newProject, setNewProject] = useState<{
    name: string
    description: string
    clientOrgId: string
    executingOrgId: string
    status: Project['status']
  }>({
    name: '',
    description: '',
    clientOrgId: '',
    executingOrgId: '',
    status: 'Planning',
  })

  const canManage = canManageProjects(user)

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations()
  }, [])

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast.error('Project name is required')
      return
    }

    if (!newProject.clientOrgId || !newProject.executingOrgId) {
      toast.error('Please select both client and executing organizations')
      return
    }

    setIsLoading(true)
    try {
      const response = await axiosInstance.post('/projects', {
        name: newProject.name,
        description: newProject.description,
        clientOrgId: newProject.clientOrgId,
        executingOrgId: newProject.executingOrgId,
        status: newProject.status
      })

      // API returns { success, data }
      const createdProject = response.data.data || response.data
      onProjectsChange([...projects, createdProject])
      setIsDialogOpen(false)
      setNewProject({
        name: '',
        description: '',
        clientOrgId: organizations[0]?.id || '',
        executingOrgId: organizations[1]?.id || organizations[0]?.id || '',
        status: 'Planning',
      })
      toast.success('Project created successfully')
    } catch (error: any) {
      console.error('Failed to create project:', error)
      toast.error(error.response?.data?.error || 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      await axiosInstance.delete(`/projects/${projectId}`)
      onProjectsChange(projects.filter(p => p.id !== projectId))
      toast.success('Project deleted successfully')
    } catch (error: any) {
      console.error('Failed to delete project:', error)
      toast.error(error.response?.data?.error || 'Failed to delete project')
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await axiosInstance.get('/organizations')
      const orgsData = response.data.data || response.data || []
      setOrganizations(orgsData)
      // Set default organization if available
      if (orgsData.length > 0 && !newProject.clientOrgId) {
        setNewProject(prev => ({
          ...prev,
          clientOrgId: orgsData[0].id,
          executingOrgId: orgsData[0].id
        }))
      }
    } catch (error) {
      console.log('Organizations endpoint not available yet - using mock data')
      // Mock data for now
      const mockOrgs = [
        { id: 'org-1', name: 'Acme Pharmaceuticals', type: 'Client' as const, workspaceId: user.workspaceId },
        { id: 'org-2', name: 'Internal Lab', type: 'Laboratory' as const, workspaceId: user.workspaceId }
      ]
      setOrganizations(mockOrgs)
      setNewProject(prev => ({
        ...prev,
        clientOrgId: mockOrgs[0].id,
        executingOrgId: mockOrgs[1].id
      }))
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Active': return 'default'
      case 'Planning': return 'secondary'
      case 'On Hold': return 'outline'
      case 'Completed': return 'outline'
      case 'Archived': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Projects</h2>
            <p className="text-muted-foreground">
              Manage laboratory research and testing initiatives
            </p>
          </div>
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={18} />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Set up a new research or testing initiative
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client Organization</Label>
                    <Select
                      value={newProject.clientOrgId}
                      onValueChange={(val) => setNewProject({ ...newProject, clientOrgId: val })}
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.filter(org => org.type === 'Client' || org.type === 'Internal').map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                        {organizations.length === 0 && (
                          <SelectItem value="none" disabled>No organizations available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executing">Executing Lab</Label>
                    <Select
                      value={newProject.executingOrgId}
                      onValueChange={(val) => setNewProject({ ...newProject, executingOrgId: val })}
                    >
                      <SelectTrigger id="executing">
                        <SelectValue placeholder="Select executing lab" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.filter(org => org.type === 'Laboratory' || org.type === 'Internal').map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                        {organizations.length === 0 && (
                          <SelectItem value="none" disabled>No organizations available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
                    <Select 
                      value={newProject.status} 
                      onValueChange={(val) => setNewProject({ ...newProject, status: val as Project['status'] })}
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Planning">Planning</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject}>
                    Create Project
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlass
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={64} className="mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {projects.length === 0 ? 'No projects yet' : 'No projects found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projects.length === 0 
                ? 'Create your first project to get started' 
                : 'Try adjusting your search query'}
            </p>
            {canManage && projects.length === 0 && (
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <Plus size={18} />
                Create First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow group cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProject(project)
                            toast.info('Edit functionality coming soon')
                          }}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                        >
                          <Trash size={14} />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
