
import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useForm } from 'react-hook-form';
import { toast } from './ui/sonner';
import { Mail, PawPrint } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Define form schema with zod
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  updates: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const NewsletterSection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      updates: true,
    },
  });

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("You're subscribed! Thanks for joining the pack 🐾", {
        duration: 5000,
      });
      form.reset();
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <>
      {/* Top Wave */}
      <div className="w-full overflow-hidden leading-[0]" style={{ marginBottom: '-2px' }}>
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="w-full h-[60px] md:h-[80px] block"
        >
          <path 
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" 
            className="fill-[#E1E8E0]"
          ></path>
        </svg>
      </div>
      <section className="bg-[#E1E8E0] pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="lg:flex lg:items-center lg:justify-between">
            {/* Text Content */}
            <div className="mb-8 lg:mb-0 lg:pr-8 lg:w-1/2">
              <div className="flex items-center mb-2">
                <PawPrint className="w-6 h-6 text-brand-dark-green mr-2" />
                <h2 className="text-3xl md:text-4xl font-berkshire text-brand-dark-green">
                  Stay in the Loop with Dog Quest
                </h2>
              </div>
              <p className="text-lg text-gray-700 mt-4">
                Get the latest blog stories, product updates, news, and announcements - delivered right to your inbox.
              </p>
            </div>

            {/* Form */}
            <div className="lg:w-1/2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <Input
                                type="email"
                                placeholder="you@example.com"
                                className="pl-10 pr-4 py-3 h-12 border-2 focus-visible:ring-offset-brand-soft-green"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={isSubmitting}
                      className="bg-brand-dark-green hover:bg-brand-soft-green transition-colors h-12"
                    >
                      {isSubmitting ? "Subscribing..." : "Subscribe"}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="updates"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-1">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <p className="text-sm text-gray-600">
                            I agree to receive updates from Dog Quest.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default NewsletterSection;
