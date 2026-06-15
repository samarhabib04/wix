import { z } from "zod";
import { validateIrishPhoneNumber } from "@/lib/utils/irish-data";

/** Shared by `/contact` and `POST /api/contact`. */
export const contactFormSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." })
    .max(50, { message: "Full name cannot exceed 50 characters." }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address." })
    .max(100, { message: "Email cannot exceed 100 characters." }),
  phone: z
    .string()
    .min(1, { message: "Phone number is required." })
    .refine(validateIrishPhoneNumber, {
      message:
        "Please enter a valid phone number (South Africa, USA, Ireland, or Canada).",
    }),
  subject: z.string({
    message: "Please select a subject for your message.",
  }),
  message: z
    .string()
    .min(10, { message: "Your message must be at least 10 characters." })
    .max(1000, { message: "Message cannot exceed 1000 characters." }),
  consent: z.boolean({}).refine((val) => val === true, {
    message: "You must agree to our terms to continue.",
  }),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
