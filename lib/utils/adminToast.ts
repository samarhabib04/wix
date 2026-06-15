// Standard admin toast styles for consistent notifications across dashboard
export const adminToast = {
  success: (message: string) => ({
    title: "Success",
    description: message,
    className: "border-brand-light-green bg-brand-light-green/10 text-brand-dark-green",
  }),
  error: (message: string) => ({
    title: "Error", 
    description: message,
    variant: "destructive" as const,
  }),
  warning: (message: string) => ({
    title: "Warning",
    description: message,
    className: "border-amber-200 bg-amber-50 text-amber-900",
  }),
  info: (message: string) => ({
    title: "Info",
    description: message,
    className: "border-blue-200 bg-blue-50 text-blue-900",
  })
};
