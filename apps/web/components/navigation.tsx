"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui"
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText,
  Settings,
  Eye
} from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useEnrichmentJobs } from "@workspace/ui"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Enrichment Jobs",
    href: "/jobs", 
    icon: Briefcase
  },
  {
    name: "Fact Viewer",
    href: "/facts",
    icon: FileText
  },
  {
    name: "Organization Viewer",
    href: "/viewer/stepan.com",
    icon: Eye
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings
  }
]

export function Navigation() {
  const pathname = usePathname()
  const { jobs } = useEnrichmentJobs()
  
  // Get the 3 most recent jobs for sidebar
  const recentJobs = jobs.slice(0, 3).map(job => ({
    domain: job.domain,
    status: job.status
  }))

  return (
    <nav className="bg-sidebar border-r border-sidebar-border w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-primary-foreground font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-lg text-sidebar-foreground">Resilion</span>
          </div>
          <ThemeToggle />
        </div>
        
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-border"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50"
                  )} />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Recent Jobs Section */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
            Recent Jobs
          </h3>
          <ul className="space-y-1">
            {recentJobs.map((job, index) => (
              <li key={index}>
                <Link
                  href={`/jobs?domain=${job.domain}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent/50 transition-colors group"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    job.status === "completed" ? "bg-success" :
                    job.status === "failed" ? "bg-destructive" :
                    job.status === "running" ? "bg-info" :
                    "bg-warning"
                  )} />
                  <span className="text-sidebar-foreground/70 group-hover:text-sidebar-foreground truncate transition-colors">
                    {job.domain}
                  </span>
                </Link>
              </li>
            ))}
            {recentJobs.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                No recent jobs
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}
