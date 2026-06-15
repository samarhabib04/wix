'use client';

import React, { useState, useEffect, useCallback } from "react";
import {
  Toast,
  ToastActionElement,
  ToastProps as ToastPrimitiveProps,
} from "@/components/ui/toast";

export interface ToastProps {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  onOpenChange?: (open: boolean) => void;
  duration?: number; // Added duration property
}

export type ToasterToast = ToastProps & {
  id: string
}

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 3000 // Changed from 1000000 to a more reasonable 3000ms (3 seconds)

type ToasterToastOptions = Omit<ToasterToast, "id">

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

// Use an array to store toasts and enable proper updates
let toasts: ToasterToast[] = []

export function toast(opts: ToastProps) {
  const id = opts.id || genId()

  const update = (props: ToasterToastOptions) => {
    toasts = toasts.map((t) => {
      if (t.id === id) {
        return { ...t, ...props }
      }
      return t
    })
    // Trigger re-render for any subscribers
    dispatchToastsChange(toasts)
  }

  const dismiss = () => {
    toasts = toasts.filter((t) => t.id !== id)
    dispatchToastsChange(toasts)
  }

  // Add the toast to the array
  const newToast: ToasterToast = {
    ...opts,
    id,
    onOpenChange: (open: boolean) => {
      if (!open) {
        setTimeout(() => {
          toasts = toasts.filter((t) => t.id !== id)
          dispatchToastsChange(toasts)
        }, TOAST_REMOVE_DELAY)
      }
      opts.onOpenChange?.(open)
    },
  }

  // Add the toast to the array
  toasts = [newToast, ...toasts].slice(0, TOAST_LIMIT)
  
  // Trigger re-render for any subscribers
  dispatchToastsChange(toasts)

  return {
    id,
    dismiss,
    update,
  }
}

// Create a custom event to notify subscribers of toast changes
const dispatchToastsChange = (updatedToasts: ToasterToast[]) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toast-change', { detail: updatedToasts }))
  }
}

export function useToast() {
  const [toastState, setToastState] = useState<ToasterToast[]>(toasts)
  
  useEffect(() => {
    // Listen for changes to the toasts array
    const handleToastChange = (event: CustomEvent<ToasterToast[]>) => {
      setToastState([...event.detail])
    }
    
    // Add event listener
    window.addEventListener('toast-change' as any, handleToastChange as EventListener)
    
    // Clean up
    return () => {
      window.removeEventListener('toast-change' as any, handleToastChange as EventListener)
    }
  }, [])

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      toasts = toasts.filter(t => t.id !== toastId)
    } else {
      toasts = []
    }
    dispatchToastsChange(toasts)
  }, [])

  return {
    toast,
    toasts: toastState,
    dismiss,
  }
}
