import { useState, useEffect } from 'react';
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
  FormDescription,
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
import { Loader2, Sparkles } from 'lucide-react';
import {
  fetchIndustryMultiples,
  getMultipleForIndustry,
  fallbackIndustryMultiples,
  type IndustryMultiples,
} from '@/services/marketData';

const formSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  industry: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  company_type: z.enum(['pipeline', 'portfolio', 'prospect']),
  pipeline_stage: z.string().optional(),
  ebitda_ltm: z.number().optional(),
  valuation: z.number().optional(),
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
  const [industryMultiples, setIndustryMultiples] = useState<IndustryMultiples>(fallbackIndustryMultiples);
  const [currentMultiple, setCurrentMultiple] = useState<number | null>(null);
  const [isAutoValuation, setIsAutoValuation] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      industry: '',
      website: '',
      company_type: 'prospect',
      pipeline_stage: '',
      ebitda_ltm: undefined,
      valuation: undefined,
    },
  });

  const companyType = form.watch('company_type');
  const industry = form.watch('industry');
  const ebitda = form.watch('ebitda_ltm');

  // Fetch industry multiples on mount
  useEffect(() => {
    if (open) {
      fetchIndustryMultiples().then((result) => {
        setIndustryMultiples(result.data);
      });
    }
  }, [open]);

  // Auto-calculate valuation when industry or EBITDA changes
  useEffect(() => {
    if (industry && industryMultiples) {
      const multiple = getMultipleForIndustry(industry, industryMultiples);
      setCurrentMultiple(multiple);

      if (ebitda && multiple) {
        const calculatedValuation = ebitda * multiple;
        form.setValue('valuation', calculatedValuation);
        setIsAutoValuation(true);
      }
    } else {
      setCurrentMultiple(null);
    }
  }, [industry, ebitda, industryMultiples, form]);

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      form.reset();
      setIsAutoValuation(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '';
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-card border-border max-h-[90vh] overflow-y-auto">
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
                  {currentMultiple && (
                    <FormDescription className="flex items-center gap-1 text-primary">
                      <Sparkles className="h-3 w-3" />
                      Market multiple: {currentMultiple.toFixed(1)}x EV/EBITDA
                    </FormDescription>
                  )}
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
              <>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ebitda_ltm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LTM EBITDA ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 5000000"
                            className="bg-background border-border"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
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
                    name="valuation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Est. Valuation
                          {isAutoValuation && (
                            <span className="text-xs text-primary font-normal">(auto)</span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enterprise value"
                            className="bg-background border-border"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              field.onChange(value);
                              setIsAutoValuation(false);
                            }}
                          />
                        </FormControl>
                        {field.value && (
                          <FormDescription>
                            {formatCurrency(field.value)}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
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
