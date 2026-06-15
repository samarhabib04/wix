
import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Enhanced default options for smoother scrolling across devices
    const defaultOptions: CarouselOptions = {
      align: 'start',
      loop: true,
      dragFree: true, // Enable momentum-based scrolling
      containScroll: 'trimSnaps',
      slidesToScroll: 1,
      skipSnaps: true, // Allow free scrolling between snap points
      inViewThreshold: 0.6,
      breakpoints: {
        // Responsive options
        '(max-width: 640px)': {
          // Mobile specific settings
          dragFree: true,
          skipSnaps: true,
        }
      },
      duration: 30, // Slower animation time in frames for smoother transitions
    }

    // Merge default options with user-provided options
    const mergedOpts = { ...defaultOptions, ...opts }

    // Create wheel gestures plugin with configuration for better mobile behavior
    const wheelGestures = WheelGesturesPlugin({
      // Improved wheel gesture settings for natural scrolling behavior
      forceWheelAxis: orientation === "horizontal" ? "x" : "y",
      wheelDraggingClass: "embla--wheel-dragging",
      wheelMultiplier: 1.2, // Reduced for less aggressive wheel capture
      // Improved options for mobile
      smoothing: true,
      smoothingDuration: 200,
      smoothingFunction: (t: number) => 1 - Math.pow(1 - t, 2),
    } as any)

    // Combine user plugins with wheel gestures plugin
    const allPlugins = React.useMemo(() => {
      const pluginsArray = plugins ? (Array.isArray(plugins) ? plugins : [plugins]) : []
      return [...pluginsArray, wheelGestures]
    }, [plugins, wheelGestures])
    
    // Initialize the carousel with improved options
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...mergedOpts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      allPlugins
    )
    
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )
    
    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)
      
      // Add global styles for better mobile behavior
      const styleElement = document.createElement('style')
      styleElement.textContent = `
        .embla {
          overflow-y: visible !important;
          overflow-x: clip;
          -webkit-overflow-scrolling: touch;
          touch-action: ${orientation === "horizontal" ? "pan-y pinch-zoom" : "pan-x pinch-zoom"}; /* Allow page scroll while enabling carousel */
        }
        
        .embla__container {
          transition-property: transform;
          transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          touch-action: ${orientation === "horizontal" ? "pan-y" : "pan-x"}; /* Allow perpendicular scrolling */
        }

        /* Improve touch interactions while preserving vertical scroll */
        .embla--wheel-dragging {
          cursor: grab !important;
          user-select: none !important;
        }
        
        /* Better mobile touch behavior - allow vertical page scroll */
        .embla__viewport {
          -webkit-overflow-scrolling: touch;
          touch-action: ${orientation === "horizontal" ? "pan-y pinch-zoom" : "pan-x pinch-zoom"};
        }
        
        /* Natural momentum scrolling with better mobile support */
        .embla.embla--draggable .embla__container {
          will-change: transform;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          touch-action: ${orientation === "horizontal" ? "pan-y" : "pan-x"};
        }
      `
      document.head.appendChild(styleElement)

      return () => {
        api?.off("select", onSelect)
        document.head.removeChild(styleElement)
      }
    }, [api, onSelect])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts: mergedOpts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
        }}
      >
        <div
          ref={ref}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative will-change-transform", className)}
          role="region"
          aria-roledescription="carousel"
          style={{ touchAction: orientation === "horizontal" ? 'pan-y pinch-zoom' : 'pan-x pinch-zoom' }}
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

// We use React.memo on all the carousel components to prevent unnecessary re-renders
const CarouselContent = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden embla">
      <div
        ref={ref}
        className={cn(
  "flex will-change-transform",
  orientation === "horizontal" ? "" : "flex-col",
  className
)}
        style={{ touchAction: orientation === "horizontal" ? 'pan-y' : 'pan-x' }}
        {...props}
      />
    </div>
  )
}))
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.memo(React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full will-change-transform",
        orientation === "horizontal" ? "" : "pt-4",
        className
      )}
      style={{ touchAction: orientation === "horizontal" ? 'pan-y' : 'pan-x' }}
      {...props}
    />
  )
}))
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.memo(React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full transition-opacity hover:opacity-100",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}))
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.memo(React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full transition-opacity hover:opacity-100",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}))
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
