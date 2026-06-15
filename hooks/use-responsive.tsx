
import * as React from "react"

const TABLET_BREAKPOINT = 1024

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState<boolean>(false)

  React.useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= TABLET_BREAKPOINT)
    }
    
    // Run immediately for initial state
    checkIsDesktop()
    
    // Set up event listener for window resize
    window.addEventListener('resize', checkIsDesktop)
    
    // Also use matchMedia for more accurate detection
    const mediaQuery = window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px)`)
    
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
    }
    
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange)
    } else {
      mediaQuery.addListener(handleMediaChange)
    }
    
    return () => {
      window.removeEventListener('resize', checkIsDesktop)
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleMediaChange)
      } else {
        mediaQuery.removeListener(handleMediaChange)
      }
    }
  }, [])

  return isDesktop
}
