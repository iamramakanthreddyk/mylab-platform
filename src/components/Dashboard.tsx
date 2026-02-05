import { User, Project, Sample } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FolderOpen, 
  Flask, 
  ChartLine, 
  Users, 
  Plus,
  ArrowRight 
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { PaymentNotificationWidget } from '@/components/PaymentNotificationWidget'
import { SystemNotificationWidget } from '@/components/SystemNotificationWidget'
import { useNavigate } from 'react-router-dom'

interface DashboardProps {
  user: User
  projects: Project[]
  samples: Sample[]
}

export function Dashboard({ user, projects, samples }: DashboardProps) {
  const navigate = useNavigate()
  // Defensive: ensure data is always an array
  const safeProjects = projects || []
  const safeSamples = samples || []
  const activeProjects = safeProjects.filter(p => p.status === 'Active').length
  const totalProjects = safeProjects.length
  const totalSamples = safeSamples.length
  const analyzedSamples = safeSamples.filter(s => s.status === 'Analyzed').length

  const statCards = [
    {
      title: 'Active Projects',
      value: activeProjects,
      total: totalProjects,
      icon: FolderOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Samples Tracked',
      value: totalSamples,
      icon: Flask,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Analyses Complete',
      value: analyzedSamples,
      icon: ChartLine,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Collaborating Orgs',
      value: 0, // Will be calculated when organization data is available
      icon: Users,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user.name ? user.name.split(' ')[0] : 'User'}
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening in your laboratory today
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">          {/* Payment Notifications - Only for Admins */}
          {user.role === 'Admin' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <PaymentNotificationWidget />
            </motion.div>
          )}

          {/* System Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SystemNotificationWidget />
          </motion.div>          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon size={20} className={stat.color} weight="duotone" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stat.value}
                    {stat.total && (
                      <span className="text-lg text-muted-foreground ml-1">/ {stat.total}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen size={20} className="text-primary" />
                    Recent Projects
                  </CardTitle>
                  <CardDescription>Your most active laboratory projects</CardDescription>
                </div>
                <Button onClick={() => onNavigate('projects')} variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="mb-3">No projects yet</p>
                  <Button onClick={() => onNavigate('projects')} size="sm" className="gap-2">
                    <Plus size={16} />
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                safeProjects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate('/projects')}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {project.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={project.status === 'Active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                      <ArrowRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} className="text-accent" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common laboratory tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => navigate('/projects')} 
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Plus size={18} />
                Create New Project
              </Button>
              <Button 
                onClick={() => navigate('/samples')} 
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Flask size={18} />
                Register Sample
              </Button>
              <Button 
                onClick={() => navigate('/samples')} 
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <ChartLine size={18} />
                View Analysis Results
              </Button>
              {user.role === 'Admin' && (
                <Button 
                  onClick={() => navigate('/schema')} 
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                >
                  <FolderOpen size={18} />
                  Database Schema
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
