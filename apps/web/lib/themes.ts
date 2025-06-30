export interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    destructive: string
    info: string
    muted: string
    accent: string
  }
}

export const themes: Record<string, Theme> = {
  default: {
    name: "Default (Slate)",
    colors: {
      primary: "222.2 47.4% 11.2%",
      secondary: "210 40% 96%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "210 40% 96%",
      accent: "210 40% 96%"
    }
  },
  blue: {
    name: "Blue",
    colors: {
      primary: "221.2 83.2% 53.3%",
      secondary: "214.3 31.8% 91.4%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "214.3 31.8% 91.4%",
      accent: "214.3 31.8% 91.4%"
    }
  },
  green: {
    name: "Green",
    colors: {
      primary: "142.1 76.2% 36.3%",
      secondary: "138.5 76.2% 96.7%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "138.5 76.2% 96.7%",
      accent: "138.5 76.2% 96.7%"
    }
  },
  orange: {
    name: "Orange",
    colors: {
      primary: "24.6 95% 53.1%",
      secondary: "24.6 95% 97.1%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "24.6 95% 97.1%",
      accent: "24.6 95% 97.1%"
    }
  },
  violet: {
    name: "Violet",
    colors: {
      primary: "262.1 83.3% 57.8%",
      secondary: "270 95.2% 98%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "270 95.2% 98%",
      accent: "270 95.2% 98%"
    }
  },
  rose: {
    name: "Rose",
    colors: {
      primary: "346.8 77.2% 49.8%",
      secondary: "355.7 100% 97.3%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "355.7 100% 97.3%",
      accent: "355.7 100% 97.3%"
    }
  },
  stone: {
    name: "Stone",
    colors: {
      primary: "25 5.3% 44.7%",
      secondary: "60 4.8% 95.9%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "60 4.8% 95.9%",
      accent: "60 4.8% 95.9%"
    }
  },
  neutral: {
    name: "Neutral",
    colors: {
      primary: "0 0% 45.1%",
      secondary: "0 0% 96.1%",
      success: "142.1 76.2% 36.3%",
      warning: "47.9 95.8% 53.1%",
      destructive: "0 84.2% 60.2%",
      info: "221.2 83.2% 53.3%",
      muted: "0 0% 96.1%",
      accent: "0 0% 96.1%"
    }
  }
}

export function applyTheme(themeKey: string) {
  const theme = themes[themeKey]
  if (!theme) return

  const root = document.documentElement
  
  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })

  // Store theme preference
  localStorage.setItem('theme', themeKey)
}

export function getStoredTheme(): string {
  if (typeof window === 'undefined') return 'default'
  return localStorage.getItem('theme') || 'default'
}
