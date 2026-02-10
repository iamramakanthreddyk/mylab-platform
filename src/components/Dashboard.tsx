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
  ArrowRight,
  TestTube,
  ChartBar,
  Stack
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
  const normalizedRole = user.role.toLowerCase()
  const isAdmin = normalizedRole === 'admin'
  // Defensive: ensure data is always an array
  const safeProjects = projects || []
  const safeSamples = samples || []
  const activeProjects = safeProjects.filter(p => p.status === 'Active').length
  const totalProjects = safeProjects.length
  const totalSamples = safeSamples.length
  const analyzedSamples = safeSamples.filter(s => s.status === 'Analyzed').length

  // Calculate workflow-specific stats
  const samplesWithTrials = safeSamples.filter(s => s.trials && s.trials.length > 0).length
  const totalTrials = safeSamples.reduce((acc, sample) => acc + (sample.trials?.length || 0), 0)
  const samplesFromSelectedTrials = safeSamples.filter(s => s.selectedTrialId).length

  const statCards = [
    {
      title: 'Active Projects',
      value: activeProjects,
      total: totalProjects,
      icon: FolderOpen,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/projects'
    },
    {
      title: 'Samples Tracked',
      value: totalSamples,
      icon: Flask,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      route: '/samples'
    },
    {
      title: 'Experimental Trials',
      value: totalTrials,
      icon: TestTube,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      route: '/samples'
    },
    {
      title: 'Analysis Batches',
      value: 0, // Will be fetched from API once available
      icon: Stack,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      route: '/batches'
    },
  ]

  if (isAdmin) {
    statCards.push({
      title: 'User Management',
      value: 0,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      route: '/users'
    })
  }

  // Workflow summary stats
  const workflowStats = {
    projectsWithSamples: safeProjects.filter(p => 
      safeSamples.some(s => s.project_id === p.id)
    ).length,
    samplesWithTrials,
    samplesFromTrials: samplesFromSelectedTrials,
    readyForAnalysis: safeSamples.filter(s => s.status === 'Ready').length
  }

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Card 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => navigate(stat.route)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <stat.icon size={24} className={stat.color} />
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {stat.total && (
                      <p className="text-xs text-muted-foreground">
                        of {stat.total} total
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Workflow Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBar size={20} className="text-primary" />
                Experimental Workflow Overview
              </CardTitle>
              <CardDescription>Track your samples from project inception through analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FolderOpen size={32} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{workflowStats.projectsWithSamples}</div>
                  <div className="text-sm text-muted-foreground">Projects with Samples</div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TestTube size={32} className="text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{workflowStats.samplesWithTrials}</div>
                  <div className="text-sm text-muted-foreground">Samples with Trials</div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TestTube size={32} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{workflowStats.samplesFromTrials}</div>
                  <div className="text-sm text-muted-foreground">Selected from Trials</div>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ChartLine size={32} className="text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{workflowStats.readyForAnalysis}</div>
                  <div className="text-sm text-muted-foreground">Ready for Analysis</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <ArrowRight size={16} />
                    <span>Project Setup</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <ArrowRight size={16} />
                    <span>Trial Experiments</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <ArrowRight size={16} />
                    <span>Sample Selection</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <ArrowRight size={16} />
                    <span>Analysis & Results</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>          {/* Payment Notifications - Only for Admins */}
          {isAdmin && (
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
          </motion.div>

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
                <Button onClick={() => navigate('/projects')} variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {safeProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="mb-3">No projects yet</p>
                  <Button onClick={() => navigate('/projects')} size="sm" className="gap-2">
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
                Workflow Actions
              </CardTitle>
              <CardDescription>Complete experimental workflow tasks</CardDescription>
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
                <TestTube size={18} />
                Register Sample & Trials
              </Button>
              <Button 
                onClick={() => navigate('/batches')} 
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <Stack size={18} />
                Create Analysis Batch
              </Button>
              <Button 
                onClick={() => navigate('/analyses')} 
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <ChartBar size={18} />
                View Analysis Results
              </Button>
              {isAdmin && (
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
