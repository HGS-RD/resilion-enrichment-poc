"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@workspace/ui"
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText,
  Settings
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
    <nav className="bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">Resilion</span>
          </div>
          <ThemeToggle />
        </div>
        
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Recent Jobs Section */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Recent Jobs
          </h3>
          <ul className="space-y-2">
            {recentJobs.map((job, index) => (
              <li key={index}>
                <Link
                  href={`/jobs?domain=${job.domain}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    job.status === "completed" ? "bg-green-500" :
                    job.status === "failed" ? "bg-red-500" :
                    "bg-yellow-500"
                  )} />
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {job.domain}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}
