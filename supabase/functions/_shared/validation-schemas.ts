import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Reservation payment schema
export const reservationPaymentSchema = z.object({
  listingId: z.string().uuid({ message: "Invalid listing ID format" }),
  collarColor: z.string()
    .max(50, "Collar color must be less than 50 characters")
    .regex(/^[a-zA-Z\s-]+$/, "Collar color can only contain letters, spaces, and hyphens")
    .optional()
    .or(z.literal("")),
  message: z.string()
    .max(500, "Message must be less than 500 characters")
    .optional()
});

// Reservation dispute schema
export const reservationDisputeSchema = z.object({
  reservationId: z.string().uuid({ message: "Invalid reservation ID format" }),
  disputeReason: z.string()
    .min(1, "Dispute reason is required")
    .max(200, "Dispute reason must be less than 200 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  evidence: z.array(z.string().url({ message: "Invalid evidence URL" }))
    .max(10, "Maximum 10 evidence files allowed")
    .optional()
});

// Checkout cart item schema
export const cartItemSchema = z.object({
  id: z.string().uuid({ message: "Invalid product ID format" }),
  title: z.string().min(1).max(200),
  price: z.number().positive("Price must be positive").max(999999, "Price too high"),
  quantity: z.number().int().positive("Quantity must be positive").max(100, "Quantity too high"),
  image: z.string().url().optional(),
  slug: z.string().optional(), // Add slug for shipping calculation
  // Marketplace product fields - allow null for DogQuest products
  is_marketplace: z.boolean().optional().nullable(),
  business_id: z.string().uuid().optional().nullable(),
  shipping_cost: z.number().min(0).optional().nullable(),
  shipping_required: z.boolean().optional().nullable()
});

// Shipping info schema
export const shippingInfoSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(100),
  phone: z.string()
    .regex(/^[+\d\s()-]+$/, "Invalid phone number format")
    .min(10)
    .max(20)
    .optional()
});

// Subscription checkout schema - allows either priceId OR tier+billingPeriod OR productType
export const subscriptionCheckoutSchema = z.object({
  mode: z.literal('subscription').optional(), // Allow mode for logging
  priceId: z.string().optional(),
  tier: z.enum(['standard', 'premium', 'elite_marketplace', 'vet_partner_paid']).optional(),
  billingPeriod: z.enum(['monthly', 'annual']).optional(),
  productType: z.string().optional(),
  autoRenew: z.boolean().optional().default(true),
  businessListingId: z.string().uuid().optional(),
  planDetails: z.any().optional()
}).superRefine((data, ctx) => {
  // Normalize values - handle null, undefined, and empty strings
  const priceId = data.priceId && typeof data.priceId === 'string' ? data.priceId.trim() : '';
  const tier = data.tier || null;
  const billingPeriod = data.billingPeriod || null;
  const productType = data.productType && typeof data.productType === 'string' ? data.productType.trim() : '';
  
  // Check if we have at least one valid combination
  const hasPriceId = priceId !== '';
  const hasTierAndPeriod = !!(tier && billingPeriod);
  const hasProductType = productType !== '';
  
  if (!hasPriceId && !hasTierAndPeriod && !hasProductType) {

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either priceId, or both tier and billingPeriod, or productType must be provided",
      path: ['tier'] // Point to tier field for better error context
    });
  } else {

  }
});

// Payment checkout schema
export const paymentCheckoutSchema = z.object({
  cartItems: z.array(cartItemSchema).min(1, "Cart cannot be empty"),
  shippingInfo: shippingInfoSchema,
  currency: z.enum(["EUR", "GBP"]).default("EUR"),
  discount: z.union([
    z.boolean(),
    z.object({ percentOff: z.number().min(0).max(100) })
  ]).optional()
});

// Helper function to validate and return typed data
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T 
} | { 
  success: false; 
  error: string 
} {
  try {
    const validated = schema.parse(data);

    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format error messages more clearly
      console.error('Zod validation errors:', JSON.stringify(error.errors, null, 2));
      const errorMessages = error.errors.map(e => {
        // For custom errors from superRefine, use the message directly
        if (e.code === 'custom') {
          return e.message;
        }
        // For other errors, format with path
        const path = e.path.length > 0 ? e.path.join('.') : 'validation';
        // Don't show "Required" for optional fields - show the actual error message
        if (e.code === 'invalid_type' && e.message.includes('required')) {
          return `${path}: ${e.message}`;
        }
        return `${path}: ${e.message}`;
      });
      const errorMessage = errorMessages.join('; ');
      return { success: false, error: errorMessage };
    }
    console.error('Non-Zod validation error:', error);
    return { success: false, error: 'Invalid input data' };
  }
}
