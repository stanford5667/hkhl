// Company field definitions with source tracking

export const COMPANY_FIELDS = {
  // Company Info
  company_info: {
    name: { type: 'string', label: 'Company Name' },
    description: { type: 'string', label: 'Description' },
    founded: { type: 'number', label: 'Year Founded' },
    headquarters: { type: 'string', label: 'Headquarters' },
    website: { type: 'string', label: 'Website' },
    industry: { type: 'string', label: 'Industry' },
    sub_industry: { type: 'string', label: 'Sub-Industry' },
    business_model: { type: 'string', label: 'Business Model' },
    ownership_type: { type: 'string', label: 'Ownership Type' },
  },
  
  // Leadership
  team: {
    ceo_name: { type: 'string', label: 'CEO' },
    cfo_name: { type: 'string', label: 'CFO' },
    coo_name: { type: 'string', label: 'COO' },
    cto_name: { type: 'string', label: 'CTO' },
    founder_names: { type: 'array', label: 'Founders' },
    employee_count: { type: 'number', label: 'Employees' },
    leadership_team: { type: 'array', label: 'Leadership Team' },
  },
  
  // Financials
  financials: {
    revenue_ltm: { type: 'currency', label: 'LTM Revenue', unit: 'M' },
    revenue_growth_yoy: { type: 'percentage', label: 'Revenue Growth (YoY)' },
    revenue_cagr_3yr: { type: 'percentage', label: '3-Year Revenue CAGR' },
    ebitda_ltm: { type: 'currency', label: 'LTM EBITDA', unit: 'M' },
    ebitda_margin: { type: 'percentage', label: 'EBITDA Margin' },
    gross_margin: { type: 'percentage', label: 'Gross Margin' },
    net_income: { type: 'currency', label: 'Net Income', unit: 'M' },
    total_debt: { type: 'currency', label: 'Total Debt', unit: 'M' },
    cash: { type: 'currency', label: 'Cash & Equivalents', unit: 'M' },
    net_debt: { type: 'currency', label: 'Net Debt', unit: 'M' },
    revenue_per_employee: { type: 'currency', label: 'Revenue per Employee', unit: 'K' },
    recurring_revenue_pct: { type: 'percentage', label: 'Recurring Revenue %' },
  },
  
  // Market
  market: {
    tam: { type: 'currency', label: 'Total Addressable Market', unit: 'B' },
    sam: { type: 'currency', label: 'Serviceable Addressable Market', unit: 'B' },
    market_share: { type: 'percentage', label: 'Market Share' },
    market_position: { type: 'string', label: 'Market Position' },
    market_growth_rate: { type: 'percentage', label: 'Market Growth Rate' },
    key_competitors: { type: 'array', label: 'Key Competitors' },
  },
  
  // Customers
  customers: {
    customer_count: { type: 'number', label: 'Customer Count' },
    top_customers: { type: 'array', label: 'Top Customers' },
    customer_concentration: { type: 'percentage', label: 'Top 10 Customer Concentration' },
    nrr: { type: 'percentage', label: 'Net Revenue Retention' },
    churn_rate: { type: 'percentage', label: 'Churn Rate' },
  },
  
  // Deal Info
  deal: {
    asking_price: { type: 'currency', label: 'Asking Price / TEV', unit: 'M' },
    ev_ebitda_multiple: { type: 'number', label: 'EV/EBITDA Multiple' },
    ev_revenue_multiple: { type: 'number', label: 'EV/Revenue Multiple' },
    deal_source: { type: 'string', label: 'Deal Source' },
    investment_thesis: { type: 'string', label: 'Investment Thesis' },
  }
} as const;

// Source priority (higher = more trusted)
export const SOURCE_PRIORITY: Record<string, number> = {
  user_input: 100,      // User manually entered = highest trust
  document: 80,         // Extracted from uploaded document
  website: 60,          // Scraped from website
  perplexity: 40,       // From AI search
  calculated: 30,       // Computed from other fields
};

// Get field info by name
export function getFieldInfo(fieldName: string): { label: string; type: string; unit?: string; category: string } | null {
  for (const [category, fields] of Object.entries(COMPANY_FIELDS)) {
    const field = (fields as Record<string, { type: string; label: string; unit?: string }>)[fieldName];
    if (field) {
      return { ...field, category };
    }
  }
  return null;
}

// Get all fields for a category
export function getFieldsByCategory(category: string): string[] {
  const categoryFields = COMPANY_FIELDS[category as keyof typeof COMPANY_FIELDS];
  return categoryFields ? Object.keys(categoryFields) : [];
}

// Format field value for display
export function formatFieldValue(value: any, type: string, unit?: string): string {
  if (value === null || value === undefined) return 'N/A';
  
  switch (type) {
    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return 'N/A';
      return `$${num.toLocaleString()}${unit || ''}`;
    case 'percentage':
      const pct = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(pct)) return 'N/A';
      return `${pct.toFixed(1)}%`;
    case 'number':
      const n = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(n)) return 'N/A';
      return n.toLocaleString();
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
}
