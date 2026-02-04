import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Bell, Settings, Target, Users, Megaphone } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { NotificationSettings } from './NotificationSettings';
import { PaymentNotificationWidget } from './PaymentNotificationWidget';
import { SystemNotificationWorkflow } from './SystemNotificationWorkflow';
import { ProjectNotificationWorkflow } from './ProjectNotificationWorkflow';
import { BulkNotificationWorkflow } from './BulkNotificationWorkflow';

export const NotificationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Management</h1>
          <p className="text-muted-foreground">
            Manage notifications, send announcements, and monitor communication across the platform
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="center" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notification Center</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Payment Reminders</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <Megaphone className="h-4 w-4" />
            <span>System Announcements</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Project Updates</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Bulk Notifications</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">+12% from last week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Requires attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Payment Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Pending this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Notification Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Payment reminder sent to Research Lab A</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">System maintenance announcement sent</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Project milestone notification for Cancer Study</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('payments')}
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Target className="h-6 w-6 mb-2 text-orange-500" />
                  <h3 className="font-medium">Send Payment Reminder</h3>
                  <p className="text-sm text-muted-foreground">Notify about overdue payments</p>
                </button>

                <button
                  onClick={() => setActiveTab('system')}
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Megaphone className="h-6 w-6 mb-2 text-blue-500" />
                  <h3 className="font-medium">System Announcement</h3>
                  <p className="text-sm text-muted-foreground">Broadcast to all users</p>
                </button>

                <button
                  onClick={() => setActiveTab('projects')}
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Target className="h-6 w-6 mb-2 text-green-500" />
                  <h3 className="font-medium">Project Update</h3>
                  <p className="text-sm text-muted-foreground">Notify project stakeholders</p>
                </button>

                <button
                  onClick={() => setActiveTab('bulk')}
                  className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Users className="h-6 w-6 mb-2 text-purple-500" />
                  <h3 className="font-medium">Bulk Notification</h3>
                  <p className="text-sm text-muted-foreground">Target specific user groups</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="center">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentNotificationWidget />
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SystemNotificationWorkflow />
            </div>
            <div>
              <NotificationSettings />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <ProjectNotificationWorkflow />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkNotificationWorkflow />
        </TabsContent>
      </Tabs>
    </div>
  );
};