"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui"
import { 
  Palette,
  Monitor,
  Zap,
  Save,
  RotateCcw,
  Moon,
  Sun,
  Map
} from "lucide-react"
import { ThemeSelector } from "../../components/theme-selector"
import { ThemeToggle } from "../../components/theme-toggle"

export default function SettingsPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const handleSave = () => {
    // Save settings logic
    setHasUnsavedChanges(false)
    console.log("Settings saved")
  }

  const handleReset = () => {
    // Reset to defaults logic
    setHasUnsavedChanges(false)
    console.log("Settings reset to defaults")
  }

  const handleSettingChange = () => {
    setHasUnsavedChanges(true)
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize your application experience and preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasUnsavedChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className="bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted/50 rounded-lg">
          <TabsTrigger 
            value="appearance" 
            className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger 
            value="map" 
            className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Map className="h-4 w-4" />
            Map
          </TabsTrigger>
          <TabsTrigger 
            value="dashboard" 
            className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Monitor className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="jobs" 
            className="flex items-center gap-2 h-10 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Zap className="h-4 w-4" />
            Jobs
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Color Theme
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a color scheme that matches your preference
              </p>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-primary" />
                Display Preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize how content is displayed across the application
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-base font-medium">Dark Mode</label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes
                  </p>
                </div>
                <ThemeToggle />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium">Font Size</label>
                  <Select defaultValue="medium" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                      <SelectItem value="extra-large">Extra Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium">Layout Density</label>
                  <Select defaultValue="comfortable" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Map Settings */}
        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Map Style & Colors
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize the appearance of interactive maps in the Organization Viewer
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium">Map Style</label>
                  <p className="text-sm text-muted-foreground">
                    Choose the visual style for map tiles
                  </p>
                  <Select defaultValue="greyscale-transparent" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="greyscale-transparent">Greyscale with Transparent Water</SelectItem>
                      <SelectItem value="greyscale">Full Greyscale</SelectItem>
                      <SelectItem value="color">Full Color</SelectItem>
                      <SelectItem value="dark">Dark Theme</SelectItem>
                      <SelectItem value="satellite">Satellite View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium">Map Opacity</label>
                  <p className="text-sm text-muted-foreground">
                    Transparency level for map tiles
                  </p>
                  <Select defaultValue="0.7" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="0.5">50% - Very Transparent</SelectItem>
                      <SelectItem value="0.7">70% - Balanced (Current)</SelectItem>
                      <SelectItem value="0.8">80% - Mostly Opaque</SelectItem>
                      <SelectItem value="1.0">100% - Fully Opaque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-medium mb-4">Site Marker Colors</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize colors for different site operating statuses
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Active Sites</span>
                      </div>
                      <div className="text-xs text-muted-foreground">#10b981</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                        <span className="text-sm font-medium">Inactive Sites</span>
                      </div>
                      <div className="text-xs text-muted-foreground">#f59e0b</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">Under Construction</span>
                      </div>
                      <div className="text-xs text-muted-foreground">#3b82f6</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm font-medium">Closed Sites</span>
                      </div>
                      <div className="text-xs text-muted-foreground">#ef4444</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-medium mb-4">Site Type Icons</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Icons used to represent different types of facilities
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                            <path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Manufacturing</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Factory Icon</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/>
                            <path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium">R&D</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Microscope Icon</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
                            <path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Headquarters</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Building Icon</div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
                            <path d="M6 18h12"/><path d="M6 14h12"/>
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Distribution</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Warehouse Icon</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Map Behavior
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure how maps behave and interact
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium">Default Zoom Level</label>
                  <p className="text-sm text-muted-foreground">
                    Initial zoom when maps load
                  </p>
                  <Select defaultValue="2" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="1">1 - World View</SelectItem>
                      <SelectItem value="2">2 - Global (Current)</SelectItem>
                      <SelectItem value="3">3 - Continental</SelectItem>
                      <SelectItem value="4">4 - Regional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium">Marker Size</label>
                  <p className="text-sm text-muted-foreground">
                    Size of site markers on the map
                  </p>
                  <Select defaultValue="32" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="24">Small (24px)</SelectItem>
                      <SelectItem value="32">Medium (32px)</SelectItem>
                      <SelectItem value="40">Large (40px)</SelectItem>
                      <SelectItem value="48">Extra Large (48px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Dashboard Preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure your dashboard layout and default views
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium">Default Landing Page</label>
                  <Select defaultValue="dashboard" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="dashboard">Dashboard Overview</SelectItem>
                      <SelectItem value="jobs">Enrichment Jobs</SelectItem>
                      <SelectItem value="facts">Fact Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium">Recent Jobs Display</label>
                  <Select defaultValue="5" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="3">3 jobs</SelectItem>
                      <SelectItem value="5">5 jobs</SelectItem>
                      <SelectItem value="10">10 jobs</SelectItem>
                      <SelectItem value="15">15 jobs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-base font-medium">Auto-refresh Interval</label>
                <p className="text-sm text-muted-foreground">
                  How often to automatically refresh dashboard data
                </p>
                <Select defaultValue="30" onValueChange={handleSettingChange}>
                  <SelectTrigger className="w-full md:w-64 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    <SelectItem value="15">Every 15 seconds</SelectItem>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every minute</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                    <SelectItem value="0">Manual refresh only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Settings */}
        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Enrichment Job Defaults
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set default parameters for new enrichment jobs
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-base font-medium">Default Crawl Depth</label>
                  <p className="text-sm text-muted-foreground">
                    How many levels deep to crawl websites
                  </p>
                  <Select defaultValue="3" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="1">1 level (homepage only)</SelectItem>
                      <SelectItem value="2">2 levels</SelectItem>
                      <SelectItem value="3">3 levels (recommended)</SelectItem>
                      <SelectItem value="5">5 levels (thorough)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-base font-medium">Confidence Threshold</label>
                  <p className="text-sm text-muted-foreground">
                    Minimum confidence for extracted facts
                  </p>
                  <Select defaultValue="70" onValueChange={handleSettingChange}>
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border shadow-lg">
                      <SelectItem value="50">50% - Low (more results)</SelectItem>
                      <SelectItem value="70">70% - Medium (balanced)</SelectItem>
                      <SelectItem value="85">85% - High (quality focus)</SelectItem>
                      <SelectItem value="95">95% - Very High (strict)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-base font-medium">Processing Timeout</label>
                <p className="text-sm text-muted-foreground">
                  Maximum time to spend on each enrichment job
                </p>
                <Select defaultValue="300" onValueChange={handleSettingChange}>
                  <SelectTrigger className="w-full md:w-64 bg-background border-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes (recommended)</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="1200">20 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
