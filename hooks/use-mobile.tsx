
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Use matchMedia to avoid forced reflows from window.innerWidth
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Set initial state without causing reflow
    setIsMobile(mediaQuery.matches)
    
    // Modern browsers support addEventListener on MediaQueryList
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
    }
    
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange)
      return () => {
        mediaQuery.removeEventListener('change', handleMediaChange)
      }
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleMediaChange)
      return () => {
        mediaQuery.removeListener(handleMediaChange)
      }
    }
  }, [])

  return isMobile
}
