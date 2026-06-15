// Environment configuration for dynamic URLs
export const getEnvironmentConfig = () => {
  // Get the current domain
  const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Check Next.js environment variables first, then fallback to domain detection
  const nextEnvironment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const nextPasswordProtection = process.env.NEXT_PUBLIC_ENABLE_PASSWORD_PROTECTION;
  
  // Determine environment based on Next.js env var or domain
  let environment: 'development' | 'staging' | 'production' = 'development';
  
  if (nextEnvironment) {
    environment = nextEnvironment as 'development' | 'staging' | 'production';
  } else {
    // Fallback to domain detection
    if (currentDomain.includes('dogquest.ie')) {
      environment = 'production';
    } else if (currentDomain.includes('vercel.app')) {
      environment = 'staging';
    }
  }
  
  // Determine if password protection should be enabled - DOMAIN-SPECIFIC LOGIC
  let enablePasswordProtection = false;
  
  // Always enable password protection for dogquest.ie (production domain)
  if (currentDomain.includes('dogquest.ie')) {
    enablePasswordProtection = true;
  } else if (nextPasswordProtection !== undefined) {
    // For other domains, use explicit setting if provided
    enablePasswordProtection = nextPasswordProtection === 'true';
  } else {
    // Default: only enable on production
    enablePasswordProtection = environment === 'production';
  }
  
  return {
    environment,
    siteUrl: currentDomain || 'http://localhost:3000',
    authCallbackUrl: `${currentDomain || 'http://localhost:3000'}/auth/callback`,
    isDevelopment: environment === 'development',
    isStaging: environment === 'staging',
    isProduction: environment === 'production',
    enablePasswordProtection,
  };
};

// Helper to get the current site URL
export const getCurrentSiteUrl = () => {
  return getEnvironmentConfig().siteUrl;
};

// Helper to get auth callback URL
export const getAuthCallbackUrl = () => {
  return getEnvironmentConfig().authCallbackUrl;
};

// Helper to check if password protection should be enabled
export const isPasswordProtectionEnabled = () => {
  return getEnvironmentConfig().enablePasswordProtection;
};
