import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  company_type: z.enum(['pipeline', 'portfolio', 'prospect']),
  pipeline_stage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => Promise<void>;
}

const PIPELINE_STAGES = [
  'Sourcing',
  'Initial Review',
  'Management Meeting',
  'Due Diligence',
  'LOI Submitted',
  'Negotiation',
  'Closing',
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Consumer',
  'Industrial',
  'Financial Services',
  'Energy',
  'Real Estate',
  'Media & Entertainment',
  'Other',
];

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateCompanyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      industry: '',
      website: '',
      company_type: 'prospect',
      pipeline_stage: '',
    },
  });

  const companyType = form.watch('company_type');

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Create New Company</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter company name"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind} value={ind}>
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      className="bg-background border-border"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pipeline" id="pipeline" />
                        <label htmlFor="pipeline" className="text-sm cursor-pointer">
                          Pipeline
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="portfolio" id="portfolio" />
                        <label htmlFor="portfolio" className="text-sm cursor-pointer">
                          Portfolio
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="prospect" id="prospect" />
                        <label htmlFor="prospect" className="text-sm cursor-pointer">
                          Prospect
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {companyType === 'pipeline' && (
              <FormField
                control={form.control}
                name="pipeline_stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline Stage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PIPELINE_STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage.toLowerCase()}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Company
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
