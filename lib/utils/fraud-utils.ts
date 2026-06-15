/**
 * Utility functions for fraud detection and filtering
 */

/**
 * Checks if a user profile should be counted as a fraud alert
 * @param fraudFlags - The fraud_flags value from user_profiles table
 * @returns true if the user should be counted as a fraud alert
 */
export function isUnreviewedSuspiciousUser(fraudFlags: any): boolean {
  // Handle case where fraud_flags is an empty array or null
  if (!fraudFlags || (Array.isArray(fraudFlags) && fraudFlags.length === 0)) {
    return false;
  }
  
  // Handle case where fraud_flags is an object
  if (typeof fraudFlags === 'object' && !Array.isArray(fraudFlags)) {
    // Exclude if closed by admin
    if (fraudFlags.closed_by_admin === true) return false;
    
    // Exclude if reviewed (legacy support)
    if (fraudFlags.reviewed_at) return false;
    
    // Only count if is_suspicious is true OR flags array has items
    const isSuspicious = fraudFlags.is_suspicious === true;
    const hasFlags = Array.isArray(fraudFlags.flags) && fraudFlags.flags.length > 0;
    return isSuspicious || hasFlags;
  }
  
  // If it's an array (non-empty), count it (legacy format)
  if (Array.isArray(fraudFlags) && fraudFlags.length > 0) {
    return true;
  }
  
  return false;
}
