import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '@/lib/axiosConfig'
import { transformProjectForAPI } from '@/lib/endpointTransformers'
import { User, Project, Organization } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Plus, MagnifyingGlass, Calendar, Trash, Pencil, ArrowLeft } from '@phosphor-icons/react'
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
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const canManage = canManageProjects(user)

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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Button>
            <div>
              <h2 className="text-3xl font-bold mb-2">Projects</h2>
              <p className="text-muted-foreground">
                Manage laboratory research and testing initiatives
              </p>
            </div>
          </div>
          {canManage && (
            <Button 
              onClick={() => navigate('/projects/create')}
              className="gap-2"
            >
              <Plus size={18} />
              New Project
            </Button>
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
            <p className="text-muted-foreground mb-6">
              {projects.length === 0 
                ? 'Create your first project to get started with managing laboratory research and testing initiatives' 
                : 'Try adjusting your search query'}
            </p>
            {canManage && projects.length === 0 && (
              <Button onClick={() => navigate('/projects/create')} size="lg" className="gap-2">
                <Plus size={20} />
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
