
export const irishCounties = [
  "Antrim",
  "Armagh",
  "Carlow",
  "Cavan",
  "Clare",
  "Cork",
  "Derry",
  "Donegal",
  "Down",
  "Dublin",
  "Fermanagh",
  "Galway",
  "Kerry",
  "Kildare",
  "Kilkenny",
  "Laois",
  "Leitrim",
  "Limerick",
  "Longford",
  "Louth",
  "Mayo",
  "Meath",
  "Monaghan",
  "Offaly",
  "Roscommon",
  "Sligo",
  "Tipperary",
  "Tyrone",
  "Waterford",
  "Westmeath",
  "Wexford",
  "Wicklow"
];

/**
 * Validate phone numbers from supported countries: South Africa, USA, Ireland, and Canada
 * Supported formats:
 * 
 * South Africa (+27):
 * - Mobile: +27 followed by 9 digits (e.g., +27 82 123 4567)
 * - Landline: +27 followed by area code (1-2 digits) + 6-8 digits
 * - National: 0 followed by 9-10 digits
 * 
 * USA/Canada (+1):
 * - Mobile/Landline: +1 followed by 10 digits (area code + 7 digits)
 * - National: 10 digits (with or without formatting)
 * 
 * Ireland (+353):
 * - Mobile: 08X followed by 7 digits (083, 085, 086, 087, 089)
 * - Landline: Area codes (01, 02X, 04X, 05X, 06X, 07X, 09X) followed by 5-7 digits
 * - International: +353 format
 * 
 * In development mode, accepts any phone number with 7-15 digits
 * 
 * @param phone Phone number to validate
 * @returns true if valid, false otherwise
 */
export const validateIrishPhoneNumber = (phone: string): boolean => {
  if (!phone || phone.trim() === '') return false; // Phone number is required
  
  // Development mode: Allow any phone number format (7-15 digits)
  // Check if we're in development by looking for common dev indicators (only use window.location.hostname)
  const isDevelopment = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('.local') ||
    window.location.hostname.includes('lovable')
  );
  
  if (isDevelopment) {
    // In development: just check it has digits and reasonable length
    const cleanedNumber = phone.replace(/[\s\-()+]/g, '');
    // Allow 7-15 digits (international format can be longer)
    return /^\d{7,15}$/.test(cleanedNumber);
  }
  
  // Production mode: Strict validation for supported countries
  // First check: only allow digits, spaces, dashes, parentheses, and plus sign
  if (!/^[\d\s\-()+ ]+$/.test(phone)) {
    return false; // Contains invalid characters (letters, etc.)
  }
  
  // Clean the input by removing spaces, dashes, parentheses
  const cleanedNumber = phone.replace(/[\s\-()]/g, '');
  
  // Must contain only digits and optionally start with +
  if (!/^\+?\d+$/.test(cleanedNumber)) {
    return false;
  }
  
  // Handle South Africa (+27)
  if (cleanedNumber.startsWith('+27')) {
    const withoutPrefix = cleanedNumber.substring(3);
    
    // Remove leading 0 if present (national format)
    const nationalNumber = withoutPrefix.startsWith('0') 
      ? withoutPrefix.substring(1) 
      : withoutPrefix;
    
    // South Africa mobile: 9 digits (e.g., 82 123 4567)
    if (/^\d{9}$/.test(nationalNumber)) {
      return true;
    }
    
    // South Africa landline: area code (1-2 digits) + 6-8 digits (total 8-10 digits)
    if (/^\d{8,10}$/.test(nationalNumber)) {
      return true;
    }
    
    return false;
  }
  
  // Handle USA/Canada (+1)
  if (cleanedNumber.startsWith('+1')) {
    const withoutPrefix = cleanedNumber.substring(2);
    
    // USA/Canada: exactly 10 digits (area code + 7 digits)
    if (/^\d{10}$/.test(withoutPrefix)) {
      return true;
    }
    
    return false;
  }
  
  // Handle international format for Irish numbers (+353)
  if (cleanedNumber.startsWith('+353')) {
    const withoutPrefix = cleanedNumber.substring(4);
    
    // If number started with 0, remove it as international format doesn't use it
    const nationalNumber = withoutPrefix.startsWith('0') 
      ? withoutPrefix.substring(1) 
      : withoutPrefix;
    
    // Irish mobile (prefix 8X) - exactly 8 digits total
    if (/^8[3567689]\d{7}$/.test(nationalNumber)) {
      return true;
    }
    
    // Irish landlines (prefix 1, 2X, 4X, 5X, 6X, 7X, 9X) with 5-7 digits
    if (/^(?:1|[2456789][0-9])\d{5,7}$/.test(nationalNumber)) {
      return true;
    }
    
    return false;
  }
  
  // Handle international format for UK/NI numbers (+44)
  if (cleanedNumber.startsWith('+44')) {
    const withoutPrefix = cleanedNumber.substring(3);
    
    // If number started with 0, remove it as international format doesn't use it
    const nationalNumber = withoutPrefix.startsWith('0') 
      ? withoutPrefix.substring(1) 
      : withoutPrefix;
      
    // Northern Ireland landline (prefix 28) - exactly 10 digits total
    if (/^28\d{8}$/.test(nationalNumber)) {
      return true;
    }
    
    // Northern Ireland mobile (prefix 7X) - exactly 10 digits total
    if (/^7\d{9}$/.test(nationalNumber)) {
      return true;
    }
    
    return false;
  }
  
  // Check Irish numbers first (more specific patterns) before generic South Africa check
  // Irish mobile numbers (083, 085, 086, 087, 089) - exactly 10 digits total
  if (/^08[3567689]\d{7}$/.test(cleanedNumber)) {
    return true;
  }
  
  // Irish landlines - must be 8-10 digits total depending on area code
  if (/^0(?:1\d{7}|[2456789][0-9]\d{5,7})$/.test(cleanedNumber)) {
    return true;
  }
  
  // Northern Ireland landlines (028) - exactly 11 digits total
  if (/^028\d{8}$/.test(cleanedNumber)) {
    return true;
  }
  
  // Northern Ireland mobiles (07X) - exactly 11 digits total
  if (/^07\d{9}$/.test(cleanedNumber)) {
    return true;
  }
  
  // Handle South Africa national format (starts with 0, but not matching Irish patterns)
  // Only check if it's 10-11 digits and didn't match Irish patterns above
  if (cleanedNumber.startsWith('0') && cleanedNumber.length >= 10 && cleanedNumber.length <= 11) {
    const withoutZero = cleanedNumber.substring(1);
    // South Africa: 9-10 digits after the 0
    if (/^\d{9,10}$/.test(withoutZero)) {
      return true;
    }
  }
  
  // Handle USA/Canada national format (10 digits, no country code, doesn't start with 0)
  if (/^\d{10}$/.test(cleanedNumber) && !cleanedNumber.startsWith('0')) {
    return true;
  }
  
  return false;
};
