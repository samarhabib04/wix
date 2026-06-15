'use client';

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Instagram, 
  Facebook, 
  Phone,
  Home,
  ArrowRight,
} from "lucide-react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import NavigationSection from "@/components/NavigationSection";
import { sendContactFormEmail } from "@/lib/utils/email-utils";
import { CONTACT_EMAIL, CONTACT_MAILTO_HREF } from "@/lib/config/contact";
import {
  contactFormSchema as formSchema,
  type ContactFormValues,
} from "@/lib/contact-form-schema";

const ContactUs = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Define form using react-hook-form with zod validation
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      consent: false,
    },
  });

  // Handle form submission
  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    try {

      const emailResult = await sendContactFormEmail(values);
      
      if (emailResult.success) {
        toast({
          title: "Thank you!",
          description: "We'll get back to you shortly!",
        });
        form.reset();
      } else {
        toast({
          title: "Error",
          description:
            emailResult.message || "Failed to send message. Please try again.",
          variant: "destructive",
        });
        console.error("Email sending failed:", emailResult.message);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      value: CONTACT_EMAIL,
      href: CONTACT_MAILTO_HREF,
    },
    {
      icon: Instagram,
      title: "Instagram",
      value: "@dogquest.ie",
      href: "https://instagram.com/dogquest.ie",
    },
    {
      icon: Facebook,
      title: "Facebook",
      value: "facebook.com/dogquest.ie",
      href: "https://www.facebook.com/share/17pfbCRn3s/",
    },
  ];

  return (
    <>

       <div className="w-full bg-[#d1e2c4] bg-opacity-20">
      <div className="container max-w-6xl py-12 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-berkshire text-4xl md:text-5xl lg:text-6xl text-brand-dark-green mb-4">
            Get in Touch with Dog Quest
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We'd love to hear from you! Whether you have a question, some feedback, or just want to say hi - send us a message and we'll get back to you as soon as we can.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Contact Form */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-berkshire text-2xl text-brand-dark-green">
                  Send Us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John Doe" 
                                maxLength={50}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="johndoe@example.com" 
                                maxLength={100}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel" 
                                placeholder="+353 87 123 4567 or 087 123 4567" 
                                maxLength={20}
                                {...field}
                                onChange={(e) => {
                                  let value = e.target.value;
                                  
                                  // Only allow digits, spaces, +, and - for Irish phone formatting
                                  value = value.replace(/[^\d\s\+\-]/g, '');
                                  
                                  // Ensure it starts with +353 or 0 for Irish numbers ONLY
                                  if (value.length > 0) {
                                    // If starts with +, ensure it's +353 (Irish only, not +44 for NI)
                                    if (value.startsWith('+')) {
                                      if (value.length === 1) {
                                        // User just typed +, allow it
                                        value = '+';
                                      } else if (value.length === 2) {
                                        // User typed +X, only allow +3
                                        if (value[1] !== '3') {
                                          value = '+3';
                                        }
                                      } else if (value.length === 3) {
                                        // User typed +3X, only allow +35
                                        if (value[2] !== '5') {
                                          value = '+35';
                                        }
                                      } else if (value.length === 4) {
                                        // User typed +35X, only allow +353
                                        if (value[3] !== '3') {
                                          value = '+353';
                                        }
                                      } else if (value.length > 4 && !value.startsWith('+353')) {
                                        // If user tries to type something other than +353, restrict
                                        value = '+353' + value.substring(4).replace(/[^\d\s\-]/g, '');
                                      }
                                    } else if (!value.startsWith('0') && value.length > 0) {
                                      // If doesn't start with 0 or +, prepend 0 for Irish format
                                      value = '0' + value.replace(/^0+/, ''); // Remove leading zeros before prepending
                                    }
                                  }
                                  
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="General Query">General Query</SelectItem>
                                <SelectItem value="Support">Support</SelectItem>
                                <SelectItem value="Business Enquiry">Business Enquiry</SelectItem>
                                <SelectItem value="Feedback">Feedback</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us how we can help..." 
                              className="min-h-32"
                              maxLength={1000}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/1000 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="consent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-md border">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              I consent to Dog Quest storing my details to respond to my enquiry.
                            </FormLabel>
                            <FormDescription>
                              We'll only use your information to respond to your message.
                            </FormDescription>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full md:w-auto bg-brand-soft-green hover:bg-brand-dark-green"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="font-berkshire text-2xl text-brand-dark-green">
                  Contact Information
                </CardTitle>
                <CardDescription>
                  Reach out to us through any of these channels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactMethods.map((method, index) => (
                  <a 
                    key={index} 
                    href={method.href}
                    className="flex items-center p-3 rounded-lg transition-colors hover:bg-muted"
                    target={method.href.startsWith('http') ? '_blank' : undefined}
                    rel={method.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <div className="mr-4 rounded-full bg-primary/10 p-2">
                      <method.icon className="h-6 w-6 text-brand-soft-green" />
                    </div>
                    <div>
                      <p className="font-medium">{method.title}</p>
                      <p className="text-sm text-muted-foreground">{method.value}</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>

            {/* Decorative Dog Image */}
            <Card className="overflow-hidden">
              <div className="aspect-[4/3] relative">
                <AspectRatio ratio={4/3}>
                  <div className={cn(
                    "h-full w-full bg-gradient-to-br from-brand-light-green/50 to-brand-soft-green/30 flex items-center justify-center"
                  )}>
                    <div className="text-center p-6">
                      <h3 className="font-berkshire text-xl text-brand-dark-green mb-2">
                        We Bark Back Quickly!
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Our team typically responds within 24-48 hours
                      </p>
                    </div>
                  </div>
                </AspectRatio>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
            </div>
      
      {/* Navigation Section */}
      <NavigationSection />
    </>
  );
};

export default ContactUs;
