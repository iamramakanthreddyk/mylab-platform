import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { User, Project } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FolderOpen, Plus, MagnifyingGlass, Calendar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { canManageProjects } from '@/lib/auth'

interface ProjectsViewProps {
  user: User
  projects: Project[]
  onProjectsChange: (projects: Project[]) => void
}

export function ProjectsView({ user, projects, onProjectsChange }: ProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState<{
    name: string
    description: string
    clientOrgId: string
    executingOrgId: string
    status: Project['status']
  }>({
    name: '',
    description: '',
    clientOrgId: 'org-1',
    executingOrgId: 'org-1',
    status: 'Planning',
  })

  const canManage = canManageProjects(user)

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      toast.error('Project name is required')
      return
    }

    const project: Project = {
      id: `proj-${Date.now()}`,
      workspaceId: user.workspaceId,
      ...newProject,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    onProjectsChange([...projects, project])
    setIsDialogOpen(false)
    setNewProject({
      name: '',
      description: '',
      clientOrgId: 'org-1',
      executingOrgId: 'org-1',
      status: 'Planning',
    })
    toast.success('Project created successfully')
  }

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
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Polymer Stability Study"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the project objectives and scope"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="client">Client Organization</Label>
                      <Select 
                        value={newProject.clientOrgId} 
                        onValueChange={(val) => setNewProject({ ...newProject, clientOrgId: val })}
                      >
                        <SelectTrigger id="client">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org-1">Acme Pharmaceuticals</SelectItem>
                          <SelectItem value="org-2">BioTech Solutions</SelectItem>
                          <SelectItem value="org-3">Global Materials Inc</SelectItem>
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
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="org-1">Internal Lab A</SelectItem>
                          <SelectItem value="org-2">Internal Lab B</SelectItem>
                          <SelectItem value="org-3">Partner Lab</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
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
