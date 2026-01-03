import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetSeed {
  ticker: string;
  name: string;
  category: string;
  asset_type: 'stock' | 'etf' | 'reit' | 'crypto_etf';
  sector?: string;
  industry?: string;
  market_cap_tier?: 'mega' | 'large' | 'mid' | 'small' | 'micro';
  description: string;
  is_free_tier: boolean;
  liquidity_score: number;
  tags: string[];
  expense_ratio?: number;
}

// ============================================
// MEGA CAP STOCKS ($200B+)
// ============================================
const MEGA_CAP_STOCKS: AssetSeed[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Consumer Electronics', market_cap_tier: 'mega', description: 'Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'dow30', 'tech'] },
  { ticker: 'MSFT', name: 'Microsoft Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Infrastructure', market_cap_tier: 'mega', description: 'Develops, licenses, and supports software, services, devices, and solutions worldwide.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'dow30', 'tech', 'cloud'] },
  { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Internet Content & Information', market_cap_tier: 'mega', description: 'Provides various products and platforms worldwide.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'tech', 'advertising'] },
  { ticker: 'GOOG', name: 'Alphabet Inc. Class C', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Internet Content & Information', market_cap_tier: 'mega', description: 'Provides various products and platforms worldwide.', is_free_tier: true, liquidity_score: 99, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'tech', 'advertising'] },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Internet Retail', market_cap_tier: 'mega', description: 'Engages in the retail sale of consumer products and subscriptions.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'ecommerce', 'cloud'] },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'mega', description: 'Provides graphics, compute and networking solutions worldwide.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'semiconductors', 'ai'] },
  { ticker: 'META', name: 'Meta Platforms Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Internet Content & Information', market_cap_tier: 'mega', description: 'Develops products that enable people to connect through mobile devices.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'social_media', 'metaverse'] },
  { ticker: 'TSLA', name: 'Tesla Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', market_cap_tier: 'mega', description: 'Designs, develops, manufactures, and sells electric vehicles and energy systems.', is_free_tier: true, liquidity_score: 100, tags: ['magnificent_7', 'sp500', 'nasdaq100', 'ev', 'energy'] },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', category: 'us_mega_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Insurance - Diversified', market_cap_tier: 'mega', description: 'A holding company owning subsidiaries engaged in various business activities.', is_free_tier: true, liquidity_score: 98, tags: ['sp500', 'financials', 'insurance', 'warren_buffett'] },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Banks - Diversified', market_cap_tier: 'mega', description: 'Operates as a financial services company worldwide.', is_free_tier: true, liquidity_score: 98, tags: ['sp500', 'dow30', 'financials', 'banks'] },
  { ticker: 'V', name: 'Visa Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Credit Services', market_cap_tier: 'mega', description: 'Operates as a payments technology company worldwide.', is_free_tier: true, liquidity_score: 97, tags: ['sp500', 'dow30', 'financials', 'payments'] },
  { ticker: 'MA', name: 'Mastercard Incorporated', category: 'us_mega_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Credit Services', market_cap_tier: 'mega', description: 'A technology company providing transaction processing and payment-related services.', is_free_tier: true, liquidity_score: 97, tags: ['sp500', 'financials', 'payments'] },
  { ticker: 'UNH', name: 'UnitedHealth Group Incorporated', category: 'us_mega_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Healthcare Plans', market_cap_tier: 'mega', description: 'Operates as a diversified health care company.', is_free_tier: true, liquidity_score: 96, tags: ['sp500', 'dow30', 'healthcare', 'insurance'] },
  { ticker: 'JNJ', name: 'Johnson & Johnson', category: 'us_mega_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers - General', market_cap_tier: 'mega', description: 'Researches, develops, manufactures, and sells health care products worldwide.', is_free_tier: true, liquidity_score: 96, tags: ['sp500', 'dow30', 'healthcare', 'pharma', 'dividend_aristocrat'] },
  { ticker: 'LLY', name: 'Eli Lilly and Company', category: 'us_mega_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers - General', market_cap_tier: 'mega', description: 'Discovers, develops, and markets human pharmaceuticals worldwide.', is_free_tier: true, liquidity_score: 95, tags: ['sp500', 'healthcare', 'pharma', 'obesity_drugs'] },
  { ticker: 'WMT', name: 'Walmart Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Defensive', industry: 'Discount Stores', market_cap_tier: 'mega', description: 'Engages in the operation of retail, wholesale, and other units worldwide.', is_free_tier: true, liquidity_score: 95, tags: ['sp500', 'dow30', 'consumer', 'retail', 'dividend_aristocrat'] },
  { ticker: 'PG', name: 'Procter & Gamble Company', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Defensive', industry: 'Household & Personal Products', market_cap_tier: 'mega', description: 'Provides branded consumer packaged goods worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'consumer', 'dividend_aristocrat'] },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Energy', industry: 'Oil & Gas Integrated', market_cap_tier: 'mega', description: 'Engages in the exploration and production of crude oil and natural gas.', is_free_tier: true, liquidity_score: 95, tags: ['sp500', 'dow30', 'energy', 'oil', 'dividend'] },
  { ticker: 'CVX', name: 'Chevron Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Energy', industry: 'Oil & Gas Integrated', market_cap_tier: 'mega', description: 'Engages in integrated energy and chemicals operations worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'energy', 'oil', 'dividend_aristocrat'] },
  { ticker: 'AVGO', name: 'Broadcom Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'mega', description: 'Designs, develops, and supplies semiconductor and infrastructure software solutions.', is_free_tier: true, liquidity_score: 93, tags: ['sp500', 'nasdaq100', 'semiconductors', 'dividend'] },
  { ticker: 'HD', name: 'The Home Depot Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Home Improvement Retail', market_cap_tier: 'mega', description: 'Operates as a home improvement retailer.', is_free_tier: true, liquidity_score: 92, tags: ['sp500', 'dow30', 'consumer', 'retail'] },
  { ticker: 'KO', name: 'The Coca-Cola Company', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic', market_cap_tier: 'mega', description: 'Manufactures, markets, and sells various nonalcoholic beverages worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'consumer', 'beverages', 'dividend_aristocrat'] },
  { ticker: 'PEP', name: 'PepsiCo Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic', market_cap_tier: 'mega', description: 'Manufactures, markets, distributes, and sells beverages and foods worldwide.', is_free_tier: true, liquidity_score: 93, tags: ['sp500', 'nasdaq100', 'consumer', 'beverages', 'dividend_aristocrat'] },
  { ticker: 'ABBV', name: 'AbbVie Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers - General', market_cap_tier: 'mega', description: 'Discovers, develops, manufactures, and sells pharmaceuticals worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'healthcare', 'pharma', 'dividend'] },
  { ticker: 'MRK', name: 'Merck & Co. Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers - General', market_cap_tier: 'mega', description: 'Operates as a healthcare company worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'healthcare', 'pharma'] },
  { ticker: 'COST', name: 'Costco Wholesale Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Defensive', industry: 'Discount Stores', market_cap_tier: 'mega', description: 'Engages in the operation of membership warehouses.', is_free_tier: true, liquidity_score: 93, tags: ['sp500', 'nasdaq100', 'consumer', 'retail'] },
  { ticker: 'ORCL', name: 'Oracle Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Infrastructure', market_cap_tier: 'mega', description: 'Offers products and services for enterprise IT environments worldwide.', is_free_tier: true, liquidity_score: 92, tags: ['sp500', 'tech', 'cloud', 'enterprise'] },
  { ticker: 'CRM', name: 'Salesforce Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Application', market_cap_tier: 'mega', description: 'Provides customer relationship management technology.', is_free_tier: true, liquidity_score: 93, tags: ['sp500', 'dow30', 'nasdaq100', 'tech', 'cloud', 'saas'] },
  { ticker: 'ADBE', name: 'Adobe Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Application', market_cap_tier: 'mega', description: 'Operates as a diversified software company worldwide.', is_free_tier: true, liquidity_score: 93, tags: ['sp500', 'nasdaq100', 'tech', 'saas'] },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'mega', description: 'Operates as a semiconductor company worldwide.', is_free_tier: true, liquidity_score: 96, tags: ['sp500', 'nasdaq100', 'semiconductors', 'ai'] },
  { ticker: 'NFLX', name: 'Netflix Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Entertainment', market_cap_tier: 'mega', description: 'Provides entertainment services.', is_free_tier: true, liquidity_score: 95, tags: ['sp500', 'nasdaq100', 'entertainment', 'streaming'] },
  { ticker: 'DIS', name: 'The Walt Disney Company', category: 'us_mega_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Entertainment', market_cap_tier: 'mega', description: 'Operates as an entertainment company worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'entertainment', 'streaming', 'media'] },
  { ticker: 'BAC', name: 'Bank of America Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Banks - Diversified', market_cap_tier: 'mega', description: 'Provides banking and financial products and services.', is_free_tier: true, liquidity_score: 96, tags: ['sp500', 'financials', 'banks'] },
  { ticker: 'INTC', name: 'Intel Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'mega', description: 'Designs, manufactures, and sells computing and related products worldwide.', is_free_tier: true, liquidity_score: 94, tags: ['sp500', 'dow30', 'nasdaq100', 'semiconductors'] },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Communication Equipment', market_cap_tier: 'mega', description: 'Designs, manufactures, and sells IP based networking products.', is_free_tier: true, liquidity_score: 92, tags: ['sp500', 'dow30', 'nasdaq100', 'tech', 'networking'] },
  { ticker: 'IBM', name: 'International Business Machines Corporation', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Information Technology Services', market_cap_tier: 'mega', description: 'Provides integrated solutions and services worldwide.', is_free_tier: true, liquidity_score: 89, tags: ['sp500', 'dow30', 'tech', 'cloud', 'ai', 'dividend'] },
  { ticker: 'QCOM', name: 'QUALCOMM Incorporated', category: 'us_mega_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'mega', description: 'Develops technologies for the wireless industry.', is_free_tier: true, liquidity_score: 92, tags: ['sp500', 'nasdaq100', 'semiconductors', '5g'] },
  { ticker: 'NKE', name: 'NIKE Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Footwear & Accessories', market_cap_tier: 'mega', description: 'Designs, develops, markets, and sells athletic footwear and apparel.', is_free_tier: true, liquidity_score: 92, tags: ['sp500', 'dow30', 'consumer', 'retail'] },
  { ticker: 'NEE', name: 'NextEra Energy Inc.', category: 'us_mega_cap', asset_type: 'stock', sector: 'Utilities', industry: 'Utilities - Regulated Electric', market_cap_tier: 'mega', description: 'Generates, transmits, distributes, and sells electric power.', is_free_tier: true, liquidity_score: 88, tags: ['sp500', 'utilities', 'renewable_energy'] },
  { ticker: 'LIN', name: 'Linde plc', category: 'us_mega_cap', asset_type: 'stock', sector: 'Basic Materials', industry: 'Specialty Chemicals', market_cap_tier: 'mega', description: 'Operates as an industrial gas company worldwide.', is_free_tier: true, liquidity_score: 87, tags: ['sp500', 'materials', 'chemicals'] },
];

// ============================================
// LARGE CAP STOCKS ($10B - $200B) - Top 50
// ============================================
const LARGE_CAP_STOCKS: AssetSeed[] = [
  { ticker: 'ANET', name: 'Arista Networks Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Computer Hardware', market_cap_tier: 'large', description: 'Develops, markets, and sells cloud networking solutions.', is_free_tier: false, liquidity_score: 82, tags: ['sp500', 'tech', 'networking', 'cloud'] },
  { ticker: 'PANW', name: 'Palo Alto Networks Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Infrastructure', market_cap_tier: 'large', description: 'Provides cybersecurity solutions worldwide.', is_free_tier: false, liquidity_score: 85, tags: ['sp500', 'nasdaq100', 'tech', 'cybersecurity'] },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Infrastructure', market_cap_tier: 'large', description: 'Provides cloud-delivered protection across endpoints.', is_free_tier: false, liquidity_score: 86, tags: ['sp500', 'nasdaq100', 'tech', 'cybersecurity'] },
  { ticker: 'MU', name: 'Micron Technology Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductors', market_cap_tier: 'large', description: 'Designs, develops, manufactures, and sells memory products.', is_free_tier: false, liquidity_score: 90, tags: ['sp500', 'nasdaq100', 'semiconductors', 'memory'] },
  { ticker: 'LRCX', name: 'Lam Research Corporation', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductor Equipment', market_cap_tier: 'large', description: 'Designs, manufactures, and services semiconductor processing equipment.', is_free_tier: false, liquidity_score: 85, tags: ['sp500', 'nasdaq100', 'semiconductors'] },
  { ticker: 'AMAT', name: 'Applied Materials Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Semiconductor Equipment', market_cap_tier: 'large', description: 'Provides manufacturing equipment, services, and software.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'nasdaq100', 'semiconductors'] },
  { ticker: 'PLTR', name: 'Palantir Technologies Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software - Infrastructure', market_cap_tier: 'large', description: 'Builds software platforms for the intelligence community.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'nasdaq100', 'tech', 'ai', 'government'] },
  { ticker: 'AMGN', name: 'Amgen Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers', market_cap_tier: 'large', description: 'Discovers, develops, manufactures, and delivers therapeutics.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'nasdaq100', 'healthcare', 'biotech'] },
  { ticker: 'GILD', name: 'Gilead Sciences Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers', market_cap_tier: 'large', description: 'A biopharmaceutical company that develops medicines.', is_free_tier: false, liquidity_score: 86, tags: ['sp500', 'nasdaq100', 'healthcare', 'biotech'] },
  { ticker: 'ISRG', name: 'Intuitive Surgical Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Medical Devices', market_cap_tier: 'large', description: 'Develops, manufactures, and markets robotic products.', is_free_tier: false, liquidity_score: 84, tags: ['sp500', 'nasdaq100', 'healthcare', 'robotics'] },
  { ticker: 'MDT', name: 'Medtronic plc', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Medical Devices', market_cap_tier: 'large', description: 'Develops, manufactures, and sells medical therapies.', is_free_tier: false, liquidity_score: 86, tags: ['sp500', 'healthcare', 'medical_devices', 'dividend'] },
  { ticker: 'C', name: 'Citigroup Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Banks - Diversified', market_cap_tier: 'large', description: 'Provides various financial products and services.', is_free_tier: false, liquidity_score: 90, tags: ['sp500', 'financials', 'banks'] },
  { ticker: 'WFC', name: 'Wells Fargo & Company', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Banks - Diversified', market_cap_tier: 'large', description: 'Provides diversified banking products and services.', is_free_tier: false, liquidity_score: 94, tags: ['sp500', 'financials', 'banks'] },
  { ticker: 'GS', name: 'The Goldman Sachs Group Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Capital Markets', market_cap_tier: 'large', description: 'Provides various financial services.', is_free_tier: false, liquidity_score: 91, tags: ['sp500', 'dow30', 'financials', 'investment_banking'] },
  { ticker: 'MS', name: 'Morgan Stanley', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Capital Markets', market_cap_tier: 'large', description: 'Provides various financial products and services.', is_free_tier: false, liquidity_score: 91, tags: ['sp500', 'financials', 'investment_banking'] },
  { ticker: 'BLK', name: 'BlackRock Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Asset Management', market_cap_tier: 'large', description: 'Provides investment management services.', is_free_tier: false, liquidity_score: 87, tags: ['sp500', 'financials', 'asset_management'] },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Credit Services', market_cap_tier: 'large', description: 'Operates a technology platform for digital payments.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'nasdaq100', 'fintech', 'payments'] },
  { ticker: 'LOW', name: 'Lowes Companies Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Home Improvement Retail', market_cap_tier: 'large', description: 'Operates as a home improvement retailer.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'consumer', 'retail'] },
  { ticker: 'SBUX', name: 'Starbucks Corporation', category: 'us_large_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Restaurants', market_cap_tier: 'large', description: 'Operates as a roaster and retailer of specialty coffee.', is_free_tier: false, liquidity_score: 90, tags: ['sp500', 'nasdaq100', 'consumer', 'restaurants'] },
  { ticker: 'BA', name: 'The Boeing Company', category: 'us_large_cap', asset_type: 'stock', sector: 'Industrials', industry: 'Aerospace & Defense', market_cap_tier: 'large', description: 'Designs, develops, manufactures, and sells commercial jetliners.', is_free_tier: false, liquidity_score: 92, tags: ['sp500', 'dow30', 'industrials', 'aerospace'] },
  { ticker: 'CAT', name: 'Caterpillar Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Industrials', industry: 'Farm & Heavy Machinery', market_cap_tier: 'large', description: 'Manufactures and sells construction and mining equipment.', is_free_tier: false, liquidity_score: 92, tags: ['sp500', 'dow30', 'industrials', 'machinery'] },
  { ticker: 'GE', name: 'General Electric Company', category: 'us_large_cap', asset_type: 'stock', sector: 'Industrials', industry: 'Specialty Industrial Machinery', market_cap_tier: 'large', description: 'Operates as a high-tech industrial company worldwide.', is_free_tier: false, liquidity_score: 92, tags: ['sp500', 'industrials', 'aerospace'] },
  { ticker: 'UPS', name: 'United Parcel Service Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Industrials', industry: 'Freight & Logistics', market_cap_tier: 'large', description: 'Provides package delivery and logistics services.', is_free_tier: false, liquidity_score: 86, tags: ['sp500', 'industrials', 'logistics'] },
  { ticker: 'RTX', name: 'RTX Corporation', category: 'us_large_cap', asset_type: 'stock', sector: 'Industrials', industry: 'Aerospace & Defense', market_cap_tier: 'large', description: 'An aerospace and defense company.', is_free_tier: false, liquidity_score: 91, tags: ['sp500', 'industrials', 'aerospace', 'defense'] },
  { ticker: 'T', name: 'AT&T Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Telecom Services', market_cap_tier: 'large', description: 'Provides telecommunications, media, and technology services.', is_free_tier: false, liquidity_score: 93, tags: ['sp500', 'telecom', 'dividend'] },
  { ticker: 'VZ', name: 'Verizon Communications Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Telecom Services', market_cap_tier: 'large', description: 'Provides communications, technology, and entertainment products.', is_free_tier: false, liquidity_score: 92, tags: ['sp500', 'dow30', 'telecom', 'dividend'] },
  { ticker: 'PFE', name: 'Pfizer Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Drug Manufacturers', market_cap_tier: 'large', description: 'Discovers, develops, manufactures, and sells biopharmaceuticals.', is_free_tier: false, liquidity_score: 94, tags: ['sp500', 'healthcare', 'pharma', 'dividend'] },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Diagnostics & Research', market_cap_tier: 'large', description: 'Provides life sciences solutions and analytical instruments.', is_free_tier: false, liquidity_score: 88, tags: ['sp500', 'healthcare', 'diagnostics'] },
  { ticker: 'ABT', name: 'Abbott Laboratories', category: 'us_large_cap', asset_type: 'stock', sector: 'Healthcare', industry: 'Medical Devices', market_cap_tier: 'large', description: 'Discovers, develops, manufactures, and sells healthcare products.', is_free_tier: false, liquidity_score: 90, tags: ['sp500', 'healthcare', 'medical_devices', 'dividend_aristocrat'] },
  { ticker: 'AXP', name: 'American Express Company', category: 'us_large_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Credit Services', market_cap_tier: 'large', description: 'Provides charge and credit payment card products.', is_free_tier: false, liquidity_score: 90, tags: ['sp500', 'dow30', 'financials', 'payments'] },
];

// ============================================
// MID CAP STOCKS ($2B - $10B) - Selected
// ============================================
const MID_CAP_STOCKS: AssetSeed[] = [
  { ticker: 'RIVN', name: 'Rivian Automotive Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', market_cap_tier: 'mid', description: 'Designs, develops, and manufactures electric vehicles.', is_free_tier: false, liquidity_score: 85, tags: ['ev', 'growth'] },
  { ticker: 'LCID', name: 'Lucid Group Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', market_cap_tier: 'mid', description: 'Designs, engineers, and manufactures electric vehicles.', is_free_tier: false, liquidity_score: 82, tags: ['ev', 'growth'] },
  { ticker: 'COIN', name: 'Coinbase Global Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Financial Data', market_cap_tier: 'mid', description: 'Provides financial infrastructure for the crypto economy.', is_free_tier: false, liquidity_score: 88, tags: ['crypto', 'fintech'] },
  { ticker: 'HOOD', name: 'Robinhood Markets Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Capital Markets', market_cap_tier: 'mid', description: 'Operates financial services platform.', is_free_tier: false, liquidity_score: 82, tags: ['fintech', 'trading'] },
  { ticker: 'SOFI', name: 'SoFi Technologies Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Financial Services', industry: 'Credit Services', market_cap_tier: 'mid', description: 'Operates a digital financial services platform.', is_free_tier: false, liquidity_score: 80, tags: ['fintech', 'banking'] },
  { ticker: 'PATH', name: 'UiPath Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Technology', industry: 'Software', market_cap_tier: 'mid', description: 'Provides end-to-end automation platform.', is_free_tier: false, liquidity_score: 75, tags: ['tech', 'automation', 'ai'] },
  { ticker: 'ROKU', name: 'Roku Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Technology', industry: 'Consumer Electronics', market_cap_tier: 'mid', description: 'Operates a TV streaming platform.', is_free_tier: false, liquidity_score: 82, tags: ['tech', 'streaming'] },
  { ticker: 'SNAP', name: 'Snap Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Internet Content', market_cap_tier: 'mid', description: 'Operates as a camera company.', is_free_tier: false, liquidity_score: 85, tags: ['social_media', 'tech'] },
  { ticker: 'PINS', name: 'Pinterest Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Communication Services', industry: 'Internet Content', market_cap_tier: 'mid', description: 'Operates a visual discovery engine.', is_free_tier: false, liquidity_score: 78, tags: ['social_media', 'tech'] },
  { ticker: 'DKNG', name: 'DraftKings Inc.', category: 'us_mid_cap', asset_type: 'stock', sector: 'Consumer Cyclical', industry: 'Gambling', market_cap_tier: 'mid', description: 'Operates a digital sports entertainment and gaming company.', is_free_tier: false, liquidity_score: 84, tags: ['gaming', 'sports_betting'] },
];

// ============================================
// BROAD MARKET ETFs
// ============================================
const BROAD_MARKET_ETFS: AssetSeed[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks the S&P 500 Index.', is_free_tier: true, liquidity_score: 100, tags: ['index', 'sp500', 'benchmark', 'core'], expense_ratio: 0.0945 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks the S&P 500 Index.', is_free_tier: true, liquidity_score: 98, tags: ['index', 'sp500', 'core', 'vanguard'], expense_ratio: 0.03 },
  { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks the S&P 500 Index.', is_free_tier: true, liquidity_score: 98, tags: ['index', 'sp500', 'core', 'ishares'], expense_ratio: 0.03 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', category: 'etf_index', asset_type: 'etf', sector: 'Technology', description: 'Tracks the Nasdaq-100 Index.', is_free_tier: true, liquidity_score: 100, tags: ['index', 'nasdaq100', 'tech', 'growth'], expense_ratio: 0.20 },
  { ticker: 'VTI', name: 'Vanguard Total Stock Market ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks the entire U.S. stock market.', is_free_tier: true, liquidity_score: 96, tags: ['index', 'total_market', 'core', 'vanguard'], expense_ratio: 0.03 },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', category: 'etf_index', asset_type: 'etf', sector: 'Small Cap', description: 'Tracks small-cap U.S. stocks.', is_free_tier: true, liquidity_score: 98, tags: ['index', 'russell2000', 'small_cap', 'benchmark'], expense_ratio: 0.19 },
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial Average ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks the Dow Jones Industrial Average.', is_free_tier: true, liquidity_score: 94, tags: ['index', 'dow30', 'blue_chip'], expense_ratio: 0.16 },
  { ticker: 'VB', name: 'Vanguard Small-Cap ETF', category: 'etf_index', asset_type: 'etf', sector: 'Small Cap', description: 'Tracks U.S. small-cap stocks.', is_free_tier: false, liquidity_score: 88, tags: ['index', 'small_cap', 'vanguard'], expense_ratio: 0.05 },
  { ticker: 'IJH', name: 'iShares Core S&P Mid-Cap ETF', category: 'etf_index', asset_type: 'etf', sector: 'Mid Cap', description: 'Tracks mid-cap U.S. stocks.', is_free_tier: false, liquidity_score: 86, tags: ['index', 'mid_cap', 'sp400'], expense_ratio: 0.05 },
  { ticker: 'VXF', name: 'Vanguard Extended Market ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Tracks stocks outside the S&P 500.', is_free_tier: false, liquidity_score: 82, tags: ['index', 'extended_market', 'vanguard'], expense_ratio: 0.06 },
  { ticker: 'RSP', name: 'Invesco S&P 500 Equal Weight ETF', category: 'etf_index', asset_type: 'etf', sector: 'Broad Market', description: 'Equal-weighted S&P 500 exposure.', is_free_tier: false, liquidity_score: 86, tags: ['index', 'sp500', 'equal_weight'], expense_ratio: 0.20 },
];

// ============================================
// SECTOR ETFs
// ============================================
const SECTOR_ETFS: AssetSeed[] = [
  { ticker: 'XLK', name: 'Technology Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Technology', description: 'Tracks technology stocks in the S&P 500.', is_free_tier: true, liquidity_score: 96, tags: ['sector', 'tech', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Financial Services', description: 'Tracks financial stocks in the S&P 500.', is_free_tier: true, liquidity_score: 96, tags: ['sector', 'financials', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLV', name: 'Health Care Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Healthcare', description: 'Tracks healthcare stocks in the S&P 500.', is_free_tier: true, liquidity_score: 94, tags: ['sector', 'healthcare', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Energy', description: 'Tracks energy stocks in the S&P 500.', is_free_tier: true, liquidity_score: 96, tags: ['sector', 'energy', 'sp500', 'oil'], expense_ratio: 0.09 },
  { ticker: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Consumer Cyclical', description: 'Tracks consumer discretionary stocks.', is_free_tier: true, liquidity_score: 92, tags: ['sector', 'consumer', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Consumer Defensive', description: 'Tracks consumer staples stocks.', is_free_tier: true, liquidity_score: 90, tags: ['sector', 'consumer_staples', 'sp500', 'defensive'], expense_ratio: 0.09 },
  { ticker: 'XLI', name: 'Industrial Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Industrials', description: 'Tracks industrial stocks in the S&P 500.', is_free_tier: true, liquidity_score: 92, tags: ['sector', 'industrials', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLB', name: 'Materials Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Basic Materials', description: 'Tracks materials stocks in the S&P 500.', is_free_tier: true, liquidity_score: 88, tags: ['sector', 'materials', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'XLU', name: 'Utilities Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Utilities', description: 'Tracks utility stocks in the S&P 500.', is_free_tier: true, liquidity_score: 88, tags: ['sector', 'utilities', 'sp500', 'dividend'], expense_ratio: 0.09 },
  { ticker: 'XLRE', name: 'Real Estate Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Real Estate', description: 'Tracks real estate stocks in the S&P 500.', is_free_tier: true, liquidity_score: 84, tags: ['sector', 'real_estate', 'sp500', 'reits'], expense_ratio: 0.09 },
  { ticker: 'XLC', name: 'Communication Services Select Sector SPDR Fund', category: 'etf_sector', asset_type: 'etf', sector: 'Communication Services', description: 'Tracks communication services stocks.', is_free_tier: true, liquidity_score: 86, tags: ['sector', 'communication', 'sp500'], expense_ratio: 0.09 },
  { ticker: 'VNQ', name: 'Vanguard Real Estate ETF', category: 'etf_sector', asset_type: 'etf', sector: 'Real Estate', description: 'Broad exposure to U.S. REITs.', is_free_tier: true, liquidity_score: 90, tags: ['sector', 'real_estate', 'reits', 'vanguard'], expense_ratio: 0.12 },
];

// ============================================
// BOND ETFs
// ============================================
const BOND_ETFS: AssetSeed[] = [
  { ticker: 'BND', name: 'Vanguard Total Bond Market ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks the entire U.S. investment-grade bond market.', is_free_tier: true, liquidity_score: 94, tags: ['bonds', 'total_bond', 'core', 'vanguard'], expense_ratio: 0.03 },
  { ticker: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks the Bloomberg U.S. Aggregate Bond Index.', is_free_tier: true, liquidity_score: 96, tags: ['bonds', 'aggregate', 'core', 'ishares'], expense_ratio: 0.03 },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks long-term U.S. Treasury bonds.', is_free_tier: true, liquidity_score: 96, tags: ['bonds', 'treasury', 'long_term'], expense_ratio: 0.15 },
  { ticker: 'IEF', name: 'iShares 7-10 Year Treasury Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks intermediate-term Treasury bonds.', is_free_tier: false, liquidity_score: 90, tags: ['bonds', 'treasury', 'intermediate'], expense_ratio: 0.15 },
  { ticker: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks short-term Treasury bonds.', is_free_tier: false, liquidity_score: 88, tags: ['bonds', 'treasury', 'short_term'], expense_ratio: 0.15 },
  { ticker: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks investment-grade corporate bonds.', is_free_tier: false, liquidity_score: 92, tags: ['bonds', 'corporate', 'investment_grade'], expense_ratio: 0.14 },
  { ticker: 'HYG', name: 'iShares iBoxx $ High Yield Corporate Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks high-yield corporate bonds.', is_free_tier: false, liquidity_score: 94, tags: ['bonds', 'high_yield', 'junk'], expense_ratio: 0.48 },
  { ticker: 'TIP', name: 'iShares TIPS Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks Treasury Inflation-Protected Securities.', is_free_tier: false, liquidity_score: 86, tags: ['bonds', 'tips', 'inflation'], expense_ratio: 0.19 },
  { ticker: 'MUB', name: 'iShares National Muni Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks investment-grade municipal bonds.', is_free_tier: false, liquidity_score: 84, tags: ['bonds', 'municipal', 'tax_exempt'], expense_ratio: 0.07 },
  { ticker: 'EMB', name: 'iShares J.P. Morgan USD Emerging Markets Bond ETF', category: 'etf_bonds', asset_type: 'etf', sector: 'Fixed Income', description: 'Tracks emerging market bonds in USD.', is_free_tier: false, liquidity_score: 82, tags: ['bonds', 'emerging_markets', 'international'], expense_ratio: 0.39 },
];

// ============================================
// INTERNATIONAL ETFs
// ============================================
const INTERNATIONAL_ETFS: AssetSeed[] = [
  { ticker: 'VXUS', name: 'Vanguard Total International Stock ETF', category: 'etf_international', asset_type: 'etf', sector: 'International', description: 'Tracks international stocks across developed and emerging markets.', is_free_tier: true, liquidity_score: 92, tags: ['international', 'total', 'vanguard'], expense_ratio: 0.08 },
  { ticker: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', category: 'etf_international', asset_type: 'etf', sector: 'International', description: 'Tracks developed market stocks outside U.S.', is_free_tier: true, liquidity_score: 92, tags: ['international', 'developed', 'vanguard'], expense_ratio: 0.05 },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', category: 'etf_international', asset_type: 'etf', sector: 'International', description: 'Tracks Europe, Australasia, and Far East stocks.', is_free_tier: true, liquidity_score: 94, tags: ['international', 'developed', 'eafe', 'benchmark'], expense_ratio: 0.32 },
  { ticker: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Tracks emerging market stocks.', is_free_tier: true, liquidity_score: 92, tags: ['international', 'emerging_markets', 'vanguard'], expense_ratio: 0.10 },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Tracks emerging market stocks.', is_free_tier: true, liquidity_score: 94, tags: ['international', 'emerging_markets', 'benchmark'], expense_ratio: 0.68 },
  { ticker: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Low-cost emerging market exposure.', is_free_tier: false, liquidity_score: 90, tags: ['international', 'emerging_markets', 'core'], expense_ratio: 0.09 },
  { ticker: 'FXI', name: 'iShares China Large-Cap ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Tracks large-cap Chinese stocks.', is_free_tier: false, liquidity_score: 90, tags: ['international', 'china', 'asia'], expense_ratio: 0.74 },
  { ticker: 'EWJ', name: 'iShares MSCI Japan ETF', category: 'etf_international', asset_type: 'etf', sector: 'International', description: 'Tracks Japanese stocks.', is_free_tier: false, liquidity_score: 86, tags: ['international', 'japan', 'asia'], expense_ratio: 0.50 },
  { ticker: 'EWZ', name: 'iShares MSCI Brazil ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Tracks Brazilian stocks.', is_free_tier: false, liquidity_score: 86, tags: ['international', 'brazil', 'latam'], expense_ratio: 0.57 },
  { ticker: 'INDA', name: 'iShares MSCI India ETF', category: 'etf_international', asset_type: 'etf', sector: 'Emerging Markets', description: 'Tracks Indian stocks.', is_free_tier: false, liquidity_score: 82, tags: ['international', 'india', 'asia'], expense_ratio: 0.64 },
];

// ============================================
// COMMODITY ETFs
// ============================================
const COMMODITY_ETFS: AssetSeed[] = [
  { ticker: 'GLD', name: 'SPDR Gold Shares', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Tracks the price of gold bullion.', is_free_tier: true, liquidity_score: 96, tags: ['commodity', 'gold', 'precious_metals', 'safe_haven'], expense_ratio: 0.40 },
  { ticker: 'IAU', name: 'iShares Gold Trust', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Low-cost gold bullion exposure.', is_free_tier: false, liquidity_score: 90, tags: ['commodity', 'gold', 'precious_metals'], expense_ratio: 0.25 },
  { ticker: 'SLV', name: 'iShares Silver Trust', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Tracks the price of silver bullion.', is_free_tier: false, liquidity_score: 90, tags: ['commodity', 'silver', 'precious_metals'], expense_ratio: 0.50 },
  { ticker: 'GDX', name: 'VanEck Gold Miners ETF', category: 'etf_commodity', asset_type: 'etf', sector: 'Basic Materials', description: 'Tracks gold mining companies.', is_free_tier: false, liquidity_score: 90, tags: ['commodity', 'gold', 'miners'], expense_ratio: 0.51 },
  { ticker: 'USO', name: 'United States Oil Fund', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Tracks WTI crude oil futures.', is_free_tier: false, liquidity_score: 86, tags: ['commodity', 'oil', 'energy'], expense_ratio: 0.83 },
  { ticker: 'UNG', name: 'United States Natural Gas Fund', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Tracks natural gas futures.', is_free_tier: false, liquidity_score: 82, tags: ['commodity', 'natural_gas', 'energy'], expense_ratio: 1.11 },
  { ticker: 'DBC', name: 'Invesco DB Commodity Index Tracking Fund', category: 'etf_commodity', asset_type: 'etf', sector: 'Commodities', description: 'Tracks a diversified basket of commodities.', is_free_tier: false, liquidity_score: 78, tags: ['commodity', 'diversified'], expense_ratio: 0.85 },
];

// ============================================
// CRYPTO ETFs
// ============================================
const CRYPTO_ETFS: AssetSeed[] = [
  { ticker: 'IBIT', name: 'iShares Bitcoin Trust', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'BlackRock spot Bitcoin ETF.', is_free_tier: false, liquidity_score: 96, tags: ['crypto', 'bitcoin', 'spot'], expense_ratio: 0.25 },
  { ticker: 'FBTC', name: 'Fidelity Wise Origin Bitcoin Fund', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'Fidelity spot Bitcoin ETF.', is_free_tier: false, liquidity_score: 92, tags: ['crypto', 'bitcoin', 'spot'], expense_ratio: 0.25 },
  { ticker: 'GBTC', name: 'Grayscale Bitcoin Trust', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'Original Bitcoin trust, now spot ETF.', is_free_tier: false, liquidity_score: 88, tags: ['crypto', 'bitcoin', 'spot'], expense_ratio: 1.50 },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'Bitcoin futures-based ETF.', is_free_tier: false, liquidity_score: 86, tags: ['crypto', 'bitcoin', 'futures'], expense_ratio: 0.95 },
  { ticker: 'ETHA', name: 'iShares Ethereum Trust', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'BlackRock spot Ethereum ETF.', is_free_tier: false, liquidity_score: 88, tags: ['crypto', 'ethereum', 'spot'], expense_ratio: 0.25 },
  { ticker: 'FETH', name: 'Fidelity Ethereum Fund', category: 'etf_crypto', asset_type: 'crypto_etf', sector: 'Cryptocurrency', description: 'Fidelity spot Ethereum ETF.', is_free_tier: false, liquidity_score: 84, tags: ['crypto', 'ethereum', 'spot'], expense_ratio: 0.25 },
];

// ============================================
// REITs
// ============================================
const REITS: AssetSeed[] = [
  { ticker: 'O', name: 'Realty Income Corporation', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Retail', market_cap_tier: 'large', description: 'Monthly dividend REIT focused on retail properties.', is_free_tier: false, liquidity_score: 88, tags: ['reit', 'retail', 'dividend_monthly', 'sp500'] },
  { ticker: 'AMT', name: 'American Tower Corporation', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Specialty', market_cap_tier: 'large', description: 'REIT focused on wireless infrastructure.', is_free_tier: false, liquidity_score: 86, tags: ['reit', 'infrastructure', 'telecom', 'sp500'] },
  { ticker: 'PLD', name: 'Prologis Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Industrial', market_cap_tier: 'large', description: 'Industrial REIT focused on logistics facilities.', is_free_tier: false, liquidity_score: 86, tags: ['reit', 'industrial', 'logistics', 'sp500'] },
  { ticker: 'CCI', name: 'Crown Castle Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Specialty', market_cap_tier: 'large', description: 'REIT focused on communications infrastructure.', is_free_tier: false, liquidity_score: 82, tags: ['reit', 'infrastructure', 'telecom', 'sp500'] },
  { ticker: 'EQIX', name: 'Equinix Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Specialty', market_cap_tier: 'large', description: 'Data center REIT providing colocation services.', is_free_tier: false, liquidity_score: 82, tags: ['reit', 'data_center', 'tech', 'sp500'] },
  { ticker: 'SPG', name: 'Simon Property Group Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Retail', market_cap_tier: 'large', description: 'Retail REIT owning shopping malls.', is_free_tier: false, liquidity_score: 84, tags: ['reit', 'retail', 'mall', 'sp500'] },
  { ticker: 'PSA', name: 'Public Storage', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Industrial', market_cap_tier: 'large', description: 'Self-storage REIT.', is_free_tier: false, liquidity_score: 82, tags: ['reit', 'self_storage', 'sp500'] },
  { ticker: 'DLR', name: 'Digital Realty Trust Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Specialty', market_cap_tier: 'large', description: 'Data center REIT.', is_free_tier: false, liquidity_score: 80, tags: ['reit', 'data_center', 'tech', 'sp500'] },
  { ticker: 'VICI', name: 'VICI Properties Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Specialty', market_cap_tier: 'large', description: 'REIT focused on gaming and hospitality properties.', is_free_tier: false, liquidity_score: 76, tags: ['reit', 'gaming', 'hospitality', 'sp500'] },
  { ticker: 'STAG', name: 'STAG Industrial Inc.', category: 'reit', asset_type: 'reit', sector: 'Real Estate', industry: 'REIT - Industrial', market_cap_tier: 'mid', description: 'Industrial REIT with monthly dividends.', is_free_tier: false, liquidity_score: 68, tags: ['reit', 'industrial', 'dividend_monthly'] },
];

// Combine all assets
const COMPLETE_ASSET_UNIVERSE: AssetSeed[] = [
  ...MEGA_CAP_STOCKS,
  ...LARGE_CAP_STOCKS,
  ...MID_CAP_STOCKS,
  ...BROAD_MARKET_ETFS,
  ...SECTOR_ETFS,
  ...BOND_ETFS,
  ...INTERNATIONAL_ETFS,
  ...COMMODITY_ETFS,
  ...CRYPTO_ETFS,
  ...REITS,
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'merge'; // 'full', 'merge', 'validate'

    console.log(`[SeedAssetUniverse] Starting with mode: ${mode}`);
    console.log(`[SeedAssetUniverse] Total assets to process: ${COMPLETE_ASSET_UNIVERSE.length}`);

    // Validate mode
    if (!['full', 'merge', 'validate'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: `Invalid mode: ${mode}. Use 'full', 'merge', or 'validate'` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If validate mode, just return the count and list
    if (mode === 'validate') {
      const summary = {
        mega_cap_stocks: MEGA_CAP_STOCKS.length,
        large_cap_stocks: LARGE_CAP_STOCKS.length,
        mid_cap_stocks: MID_CAP_STOCKS.length,
        broad_market_etfs: BROAD_MARKET_ETFS.length,
        sector_etfs: SECTOR_ETFS.length,
        bond_etfs: BOND_ETFS.length,
        international_etfs: INTERNATIONAL_ETFS.length,
        commodity_etfs: COMMODITY_ETFS.length,
        crypto_etfs: CRYPTO_ETFS.length,
        reits: REITS.length,
        total: COMPLETE_ASSET_UNIVERSE.length,
      };

      const tickers = COMPLETE_ASSET_UNIVERSE.map(a => a.ticker);

      return new Response(
        JSON.stringify({ 
          success: true, 
          mode: 'validate',
          summary,
          tickers,
          message: 'Validation complete. No changes made.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If full mode, delete all existing records first
    if (mode === 'full') {
      console.log('[SeedAssetUniverse] Full mode: Deleting existing records...');
      const { error: deleteError } = await supabase
        .from('asset_universe')
        .delete()
        .neq('ticker', ''); // Delete all records

      if (deleteError) {
        console.error('[SeedAssetUniverse] Delete error:', deleteError);
        throw new Error(`Failed to clear existing records: ${deleteError.message}`);
      }
      console.log('[SeedAssetUniverse] Existing records cleared');
    }

    // Prepare records for upsert
    const records = COMPLETE_ASSET_UNIVERSE.map(asset => ({
      ticker: asset.ticker,
      name: asset.name,
      category: asset.category,
      asset_type: asset.asset_type,
      sector: asset.sector || null,
      industry: asset.industry || null,
      market_cap_tier: asset.market_cap_tier || null,
      description: asset.description,
      short_description: asset.description.substring(0, 100) + (asset.description.length > 100 ? '...' : ''),
      is_active: true,
      is_validated: true,
      validation_date: new Date().toISOString(),
      is_free_tier: asset.is_free_tier,
      liquidity_score: asset.liquidity_score,
      tags: asset.tags,
      expense_ratio: asset.expense_ratio || null,
      primary_exchange: asset.asset_type === 'stock' || asset.asset_type === 'reit' ? 'NYSE/NASDAQ' : null,
      currency: 'USD',
      metadata: {
        seeded_at: new Date().toISOString(),
        source: 'seed-asset-universe',
      },
    }));

    // Upsert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    let updated = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      console.log(`[SeedAssetUniverse] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);

      const { data, error } = await supabase
        .from('asset_universe')
        .upsert(batch, { 
          onConflict: 'ticker',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error(`[SeedAssetUniverse] Batch error:`, error);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else if (data) {
        // Count as inserted for now (upsert doesn't distinguish)
        inserted += data.length;
      }
    }

    // For mode=full, all are inserts; for mode=merge, we can't easily distinguish
    const total = mode === 'full' ? inserted : COMPLETE_ASSET_UNIVERSE.length;

    console.log(`[SeedAssetUniverse] Complete. Inserted/Updated: ${inserted}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        mode,
        inserted: mode === 'full' ? inserted : 0,
        updated: mode === 'merge' ? inserted : 0,
        total,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          mega_cap_stocks: MEGA_CAP_STOCKS.length,
          large_cap_stocks: LARGE_CAP_STOCKS.length,
          mid_cap_stocks: MID_CAP_STOCKS.length,
          broad_market_etfs: BROAD_MARKET_ETFS.length,
          sector_etfs: SECTOR_ETFS.length,
          bond_etfs: BOND_ETFS.length,
          international_etfs: INTERNATIONAL_ETFS.length,
          commodity_etfs: COMMODITY_ETFS.length,
          crypto_etfs: CRYPTO_ETFS.length,
          reits: REITS.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[SeedAssetUniverse] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: errMessage,
        details: String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
