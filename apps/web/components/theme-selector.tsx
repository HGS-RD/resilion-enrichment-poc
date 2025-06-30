"use client"

import { useState, useEffect } from "react"
import { themes, applyTheme, getStoredTheme } from "../lib/themes"
import { Check } from "lucide-react"

interface ThemePreviewProps {
  themeKey: string
  name: string
  isSelected: boolean
  onClick: () => void
}

function ThemePreview({ themeKey, name, isSelected, onClick }: ThemePreviewProps) {
  const theme = themes[themeKey]
  
  return (
    <div
      className={`relative p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
      onClick={onClick}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      
      <div className="space-y-2">
        {/* Color preview circles */}
        <div className="flex gap-1">
          <div 
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
          />
          <div 
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: `hsl(${theme.colors.success})` }}
          />
          <div 
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: `hsl(${theme.colors.warning})` }}
          />
          <div 
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: `hsl(${theme.colors.destructive})` }}
          />
        </div>
        
        {/* Theme name */}
        <div className="text-xs font-medium text-foreground">{name}</div>
        
        {/* Mini preview card */}
        <div className="space-y-1">
          <div 
            className="h-2 rounded-sm"
            style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
          />
          <div 
            className="h-1 rounded-sm w-3/4"
            style={{ backgroundColor: `hsl(${theme.colors.muted})` }}
          />
          <div 
            className="h-1 rounded-sm w-1/2"
            style={{ backgroundColor: `hsl(${theme.colors.muted})` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState('default')

  useEffect(() => {
    // Load stored theme on mount
    const storedTheme = getStoredTheme()
    setSelectedTheme(storedTheme)
    applyTheme(storedTheme)
  }, [])

  const handleThemeChange = (themeKey: string) => {
    setSelectedTheme(themeKey)
    applyTheme(themeKey)
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Choose a color theme for your application. Changes will be applied immediately.
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(themes).map(([key, theme]) => (
          <ThemePreview
            key={key}
            themeKey={key}
            name={theme.name}
            isSelected={selectedTheme === key}
            onClick={() => handleThemeChange(key)}
          />
        ))}
      </div>
      
      {/* Current theme info */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
        <div className="text-sm font-medium mb-2">Current Theme: {themes[selectedTheme]?.name}</div>
        <div className="text-xs text-muted-foreground">
          Theme preferences are saved locally and will persist across sessions.
        </div>
      </div>
    </div>
  )
}
