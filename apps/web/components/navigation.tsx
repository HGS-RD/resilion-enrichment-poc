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

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "Jobs",
    href: "/jobs", 
    icon: Briefcase
  },
  {
    name: "Facts",
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
      </div>
    </nav>
  )
}
