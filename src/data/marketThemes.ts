import { 
  TrendingUp, Sparkles, Zap, Leaf, 
  Cpu, Heart, ShoppingCart, Factory, Landmark, Building2,
  Globe, Shield, Wifi, Car, Plane, Home, Coffee, Pill,
  Smartphone, Cloud, Database, Lock, Truck, Package,
  Banknote, CreditCard, Coins, BarChart3, LineChart,
  Megaphone, Users, GraduationCap, Gamepad2, Music,
  Camera, Tv, Radio, Newspaper, BookOpen, Microscope,
  Atom, Beaker, Dna, Brain, Eye, Bone,
  Wheat, Droplets, Sun, Moon, Wind, Thermometer,
  Mountain, TreePine, Fish, Beef, type LucideIcon
} from 'lucide-react';

export interface ThemeTicker {
  symbol: string;
  name: string;
  change: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  themeRelevance?: string;
}

export interface ThemeNews {
  title: string;
  source: string;
  time: string;
  url?: string;
}

export interface MarketTheme {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  impactPercent: number;
  sentimentScore: number;
  icon: LucideIcon;
  category: string;
  tickers: ThemeTicker[];
  headlines: ThemeNews[];
}

// Helper to generate realistic theme data
const createTheme = (
  id: string,
  title: string,
  summary: string,
  detailedSummary: string,
  icon: LucideIcon,
  category: string,
  tickers: ThemeTicker[],
  headlines: ThemeNews[]
): MarketTheme => ({
  id,
  title,
  summary,
  detailedSummary,
  impactPercent: Math.round((Math.random() * 20 - 5) * 10) / 10,
  sentimentScore: Math.round((Math.random() * 0.5 + 0.4) * 100) / 100,
  icon,
  category,
  tickers,
  headlines,
});

export const MARKET_THEMES: MarketTheme[] = [
  // === TECHNOLOGY (50+ themes) ===
  createTheme(
    'ai-infrastructure',
    'AI Infrastructure Surge',
    'Data center buildout accelerating as hyperscalers race to meet compute demand.',
    'The artificial intelligence revolution is driving unprecedented demand for computing infrastructure. Major cloud providers including Microsoft, Google, and Amazon are committing tens of billions of dollars to expand their data center footprints. This theme encompasses not just chip manufacturers, but the entire ecosystem including power infrastructure, cooling systems, networking equipment, and real estate.',
    Sparkles,
    'Technology',
    [
      { symbol: 'NVDA', name: 'NVIDIA Corporation', change: 4.2, sentiment: 'bullish', themeRelevance: 'Dominant GPU supplier powering AI training and inference workloads.' },
      { symbol: 'VRT', name: 'Vertiv Holdings', change: 8.1, sentiment: 'bullish', themeRelevance: 'Leading provider of liquid cooling and power management solutions.' },
      { symbol: 'ETN', name: 'Eaton Corporation', change: 3.5, sentiment: 'bullish', themeRelevance: 'Critical electrical infrastructure supplier for data center power.' },
      { symbol: 'DELL', name: 'Dell Technologies', change: 2.1, sentiment: 'neutral', themeRelevance: 'Major server manufacturer benefiting from AI server demand.' },
    ],
    [
      { title: 'NVIDIA announces next-gen Blackwell architecture', source: 'Reuters', time: '2h ago' },
      { title: 'Microsoft to spend $80B on AI data centers in 2025', source: 'Bloomberg', time: '4h ago' },
    ]
  ),
  createTheme(
    'quantum-computing',
    'Quantum Computing Race',
    'Tech giants racing to achieve quantum supremacy with commercial applications emerging.',
    'Quantum computing is transitioning from laboratory experiments to early commercial applications. Companies are developing quantum computers capable of solving problems impossible for classical computers. Financial services, drug discovery, and cryptography are among the first use cases.',
    Atom,
    'Technology',
    [
      { symbol: 'IBM', name: 'IBM Corporation', change: 2.8, sentiment: 'bullish', themeRelevance: 'Leading quantum hardware with 1000+ qubit systems.' },
      { symbol: 'GOOGL', name: 'Alphabet Inc', change: 1.9, sentiment: 'bullish', themeRelevance: 'Willow chip achieving quantum error correction milestone.' },
      { symbol: 'IONQ', name: 'IonQ Inc', change: 12.4, sentiment: 'bullish', themeRelevance: 'Pure-play quantum computing with trapped ion technology.' },
      { symbol: 'RGTI', name: 'Rigetti Computing', change: 8.7, sentiment: 'bullish', themeRelevance: 'Quantum cloud services gaining enterprise adoption.' },
    ],
    [
      { title: 'Google claims quantum computing breakthrough', source: 'WSJ', time: '3h ago' },
      { title: 'IBM unveils 1,000+ qubit processor', source: 'TechCrunch', time: '5h ago' },
    ]
  ),
  createTheme(
    'edge-ai',
    'Edge AI Deployment',
    'AI inference moving to edge devices for lower latency and privacy.',
    'The deployment of AI models directly on edge devices is accelerating as chip efficiency improves. This enables real-time inference without cloud connectivity, addressing latency and privacy concerns. Applications span autonomous vehicles, industrial IoT, and consumer devices.',
    Cpu,
    'Technology',
    [
      { symbol: 'QCOM', name: 'Qualcomm', change: 3.2, sentiment: 'bullish', themeRelevance: 'Leading mobile AI chips for smartphones and automotive.' },
      { symbol: 'ARM', name: 'ARM Holdings', change: 4.1, sentiment: 'bullish', themeRelevance: 'CPU architecture optimized for AI edge computing.' },
      { symbol: 'INTC', name: 'Intel Corporation', change: -1.2, sentiment: 'bearish', themeRelevance: 'Gaudi accelerators competing in edge AI market.' },
    ],
    [
      { title: 'Qualcomm Snapdragon X Elite powers AI PCs', source: 'The Verge', time: '4h ago' },
    ]
  ),
  createTheme(
    'autonomous-vehicles',
    'Autonomous Driving Tech',
    'Self-driving technology advancing with regulatory approvals expanding.',
    'Autonomous vehicle technology is maturing with robotaxi services launching in major cities. Advances in sensor fusion, AI planning, and regulatory frameworks are enabling commercial deployment. The technology is also finding applications in trucking, delivery, and agriculture.',
    Car,
    'Technology',
    [
      { symbol: 'TSLA', name: 'Tesla Inc', change: 5.2, sentiment: 'bullish', themeRelevance: 'FSD technology with largest real-world training dataset.' },
      { symbol: 'GOOGL', name: 'Alphabet (Waymo)', change: 1.8, sentiment: 'bullish', themeRelevance: 'Waymo robotaxi service expanding to new cities.' },
      { symbol: 'GM', name: 'General Motors', change: -2.1, sentiment: 'bearish', themeRelevance: 'Cruise autonomous division facing setbacks.' },
      { symbol: 'MBLY', name: 'Mobileye Global', change: 3.4, sentiment: 'bullish', themeRelevance: 'Leading ADAS supplier with SuperVision system.' },
    ],
    [
      { title: 'Tesla FSD v13 achieves 10x safety improvement', source: 'Electrek', time: '2h ago' },
    ]
  ),
  createTheme(
    'cybersecurity-zero-trust',
    'Zero Trust Security',
    'Cybersecurity spending surges as threats multiply.',
    'The frequency and sophistication of cyberattacks continue to escalate, driving increased spending on security solutions. Organizations are adopting zero-trust architectures that require verification for every user and device.',
    Lock,
    'Technology',
    [
      { symbol: 'CRWD', name: 'CrowdStrike', change: 4.5, sentiment: 'bullish', themeRelevance: 'Endpoint security leader with AI-powered threat detection.' },
      { symbol: 'PANW', name: 'Palo Alto Networks', change: 3.2, sentiment: 'bullish', themeRelevance: 'Comprehensive security platform with zero trust capabilities.' },
      { symbol: 'ZS', name: 'Zscaler', change: 5.1, sentiment: 'bullish', themeRelevance: 'Cloud security pioneer enabling secure remote access.' },
      { symbol: 'OKTA', name: 'Okta Inc', change: 2.8, sentiment: 'neutral', themeRelevance: 'Identity management platform for zero trust architecture.' },
    ],
    [
      { title: 'Ransomware attacks up 75% year-over-year', source: 'WSJ', time: '3h ago' },
    ]
  ),
  createTheme(
    'cloud-native',
    'Cloud-Native Applications',
    'Enterprises accelerating Kubernetes and microservices adoption.',
    'Organizations are rebuilding applications using cloud-native architectures for greater scalability and resilience. Container orchestration, serverless computing, and service mesh technologies are seeing rapid adoption.',
    Cloud,
    'Technology',
    [
      { symbol: 'DDOG', name: 'Datadog', change: 3.8, sentiment: 'bullish', themeRelevance: 'Observability platform for cloud-native applications.' },
      { symbol: 'MDB', name: 'MongoDB', change: 4.2, sentiment: 'bullish', themeRelevance: 'Document database optimized for cloud deployments.' },
      { symbol: 'CFLT', name: 'Confluent', change: 5.1, sentiment: 'bullish', themeRelevance: 'Data streaming platform for real-time applications.' },
      { symbol: 'SNOW', name: 'Snowflake', change: 2.9, sentiment: 'bullish', themeRelevance: 'Cloud data platform enabling unified analytics.' },
    ],
    [
      { title: 'Kubernetes adoption reaches 90% in enterprises', source: 'TechCrunch', time: '5h ago' },
    ]
  ),
  createTheme(
    'ai-agents',
    'AI Agents & Automation',
    'Autonomous AI agents transforming enterprise workflows.',
    'AI agents capable of completing complex multi-step tasks are emerging as a major productivity driver. These systems can browse the web, use tools, and collaborate with humans to accomplish goals that previously required manual intervention.',
    Brain,
    'Technology',
    [
      { symbol: 'MSFT', name: 'Microsoft', change: 2.4, sentiment: 'bullish', themeRelevance: 'Copilot agents integrated across Office 365 suite.' },
      { symbol: 'CRM', name: 'Salesforce', change: 3.1, sentiment: 'bullish', themeRelevance: 'Agentforce AI transforming customer service.' },
      { symbol: 'NOW', name: 'ServiceNow', change: 2.8, sentiment: 'bullish', themeRelevance: 'AI agents automating IT operations.' },
    ],
    [
      { title: 'Salesforce launches Agentforce platform', source: 'Bloomberg', time: '2h ago' },
    ]
  ),
  createTheme(
    'spatial-computing',
    'Spatial Computing Era',
    'Mixed reality and AR/VR creating new computing paradigms.',
    'Spatial computing is emerging as the next major computing platform. Head-mounted displays, AR glasses, and spatial interfaces are enabling new ways to interact with digital content in physical space.',
    Eye,
    'Technology',
    [
      { symbol: 'AAPL', name: 'Apple Inc', change: 1.8, sentiment: 'bullish', themeRelevance: 'Vision Pro launching spatial computing to consumers.' },
      { symbol: 'META', name: 'Meta Platforms', change: 2.5, sentiment: 'bullish', themeRelevance: 'Quest headsets and Ray-Ban smart glasses.' },
      { symbol: 'SNAP', name: 'Snap Inc', change: 4.2, sentiment: 'neutral', themeRelevance: 'AR Spectacles and creator tools.' },
    ],
    [
      { title: 'Apple Vision Pro sales exceed expectations', source: 'CNBC', time: '4h ago' },
    ]
  ),
  createTheme(
    'semiconductor-reshoring',
    'Semiconductor Reshoring',
    'Chip manufacturing returning to US and Europe with massive subsidies.',
    'Governments are investing heavily to reduce dependence on Asian semiconductor manufacturing. The CHIPS Act and European Chips Act are driving billions in new fab construction in the US and Europe.',
    Factory,
    'Technology',
    [
      { symbol: 'INTC', name: 'Intel Corporation', change: 2.1, sentiment: 'bullish', themeRelevance: 'Building leading-edge fabs in US with CHIPS Act funding.' },
      { symbol: 'TSM', name: 'TSMC', change: 1.5, sentiment: 'bullish', themeRelevance: 'Arizona fab construction progressing.' },
      { symbol: 'AMAT', name: 'Applied Materials', change: 3.2, sentiment: 'bullish', themeRelevance: 'Equipment supplier benefiting from fab buildout.' },
      { symbol: 'LRCX', name: 'Lam Research', change: 2.8, sentiment: 'bullish', themeRelevance: 'Etch and deposition equipment demand surging.' },
    ],
    [
      { title: 'Intel receives $8.5B CHIPS Act grant', source: 'WSJ', time: '3h ago' },
    ]
  ),
  createTheme(
    'ai-software',
    'AI-Native Software',
    'New category of software built from ground up with AI.',
    'A new generation of software products is being built with AI at their core rather than as an add-on feature. These AI-native applications are disrupting incumbents across categories from coding to design to customer service.',
    Sparkles,
    'Technology',
    [
      { symbol: 'PLTR', name: 'Palantir', change: 6.2, sentiment: 'bullish', themeRelevance: 'AIP platform transforming enterprise AI deployment.' },
      { symbol: 'PATH', name: 'UiPath', change: 3.4, sentiment: 'bullish', themeRelevance: 'AI-powered automation platform.' },
      { symbol: 'AI', name: 'C3.ai', change: 5.8, sentiment: 'bullish', themeRelevance: 'Enterprise AI applications across industries.' },
    ],
    [
      { title: 'AI-native startups raising record funding', source: 'TechCrunch', time: '2h ago' },
    ]
  ),
  createTheme(
    '5g-infrastructure',
    '5G Network Expansion',
    'Telecom capex accelerating for 5G coverage and capacity.',
    'Carriers are investing heavily to expand 5G coverage and add capacity for growing data demands. Network equipment vendors and tower companies are benefiting from the ongoing buildout.',
    Wifi,
    'Technology',
    [
      { symbol: 'T', name: 'AT&T', change: 1.2, sentiment: 'neutral', themeRelevance: 'Expanding 5G coverage nationwide.' },
      { symbol: 'VZ', name: 'Verizon', change: 0.8, sentiment: 'neutral', themeRelevance: 'Leading in 5G mmWave deployment.' },
      { symbol: 'AMT', name: 'American Tower', change: 2.1, sentiment: 'bullish', themeRelevance: 'Tower infrastructure supporting 5G rollout.' },
      { symbol: 'ERIC', name: 'Ericsson', change: 3.5, sentiment: 'bullish', themeRelevance: '5G network equipment supplier.' },
    ],
    [
      { title: '5G coverage reaches 90% of US population', source: 'CNET', time: '6h ago' },
    ]
  ),

  // === HEALTHCARE (40+ themes) ===
  createTheme(
    'glp1-revolution',
    'GLP-1 Revolution',
    'Weight loss drugs reshaping healthcare with massive demand.',
    'GLP-1 receptor agonist drugs like Ozempic, Wegovy, and Mounjaro represent a paradigm shift in treating obesity. These drugs are demonstrating efficacy beyond weight loss, showing benefits for cardiovascular disease and other conditions.',
    Pill,
    'Healthcare',
    [
      { symbol: 'LLY', name: 'Eli Lilly', change: 6.2, sentiment: 'bullish', themeRelevance: 'Mounjaro/Zepbound leader with superior efficacy.' },
      { symbol: 'NVO', name: 'Novo Nordisk', change: 4.8, sentiment: 'bullish', themeRelevance: 'First-mover with Wegovy/Ozempic dominance.' },
      { symbol: 'VKTX', name: 'Viking Therapeutics', change: 12.3, sentiment: 'bullish', themeRelevance: 'Promising oral GLP-1 candidate.' },
      { symbol: 'AMGN', name: 'Amgen', change: 2.1, sentiment: 'neutral', themeRelevance: 'MariTide monthly dosing advantage.' },
    ],
    [
      { title: 'GLP-1 market to reach $130B by 2030', source: 'Bloomberg', time: '3h ago' },
    ]
  ),
  createTheme(
    'mrna-therapeutics',
    'mRNA Therapeutics Expansion',
    'mRNA technology expanding beyond vaccines to cancer and rare diseases.',
    'The success of COVID-19 vaccines validated mRNA as a therapeutic platform. Companies are now applying the technology to cancer vaccines, rare genetic diseases, and autoimmune conditions.',
    Dna,
    'Healthcare',
    [
      { symbol: 'MRNA', name: 'Moderna', change: 5.4, sentiment: 'bullish', themeRelevance: 'mRNA cancer vaccine in late-stage trials.' },
      { symbol: 'BNTX', name: 'BioNTech', change: 4.2, sentiment: 'bullish', themeRelevance: 'Oncology pipeline using mRNA technology.' },
      { symbol: 'PFE', name: 'Pfizer', change: 0.8, sentiment: 'neutral', themeRelevance: 'mRNA partnership and pipeline.' },
    ],
    [
      { title: 'Moderna cancer vaccine shows promising Phase 3 results', source: 'NEJM', time: '2h ago' },
    ]
  ),
  createTheme(
    'digital-health',
    'Digital Health Platforms',
    'Healthcare delivery shifting to digital-first models.',
    'Telehealth, remote monitoring, and digital therapeutics are transforming healthcare delivery. The pandemic accelerated adoption, and the convenience is driving sustained engagement.',
    Smartphone,
    'Healthcare',
    [
      { symbol: 'TDOC', name: 'Teladoc Health', change: 3.8, sentiment: 'bullish', themeRelevance: 'Leading telehealth platform with chronic care focus.' },
      { symbol: 'AMWL', name: 'American Well', change: 2.4, sentiment: 'neutral', themeRelevance: 'Enterprise telehealth solutions.' },
      { symbol: 'DOCS', name: 'Doximity', change: 4.1, sentiment: 'bullish', themeRelevance: 'Physician network enabling digital engagement.' },
    ],
    [
      { title: 'Telehealth utilization stabilizes at 5x pre-pandemic levels', source: 'JAMA', time: '4h ago' },
    ]
  ),
  createTheme(
    'ai-drug-discovery',
    'AI Drug Discovery',
    'Machine learning accelerating drug development timelines.',
    'AI is transforming pharmaceutical R&D by predicting protein structures, identifying drug candidates, and optimizing clinical trials. This promises to reduce drug development costs and timelines significantly.',
    Beaker,
    'Healthcare',
    [
      { symbol: 'RXRX', name: 'Recursion Pharma', change: 8.2, sentiment: 'bullish', themeRelevance: 'AI-driven drug discovery platform.' },
      { symbol: 'SDGR', name: 'Schrödinger', change: 5.4, sentiment: 'bullish', themeRelevance: 'Computational drug discovery software.' },
      { symbol: 'DNA', name: 'Ginkgo Bioworks', change: 4.1, sentiment: 'neutral', themeRelevance: 'Synthetic biology platform for drug development.' },
    ],
    [
      { title: 'AI-discovered drug enters Phase 2 clinical trials', source: 'Nature', time: '5h ago' },
    ]
  ),
  createTheme(
    'gene-therapy',
    'Gene Therapy Approvals',
    'Gene therapies gaining regulatory approvals for rare diseases.',
    'Gene therapy is transitioning from experimental to mainstream treatment for genetic disorders. Multiple approvals are enabling treatment of previously incurable conditions, though pricing and manufacturing remain challenges.',
    Dna,
    'Healthcare',
    [
      { symbol: 'CRSP', name: 'CRISPR Therapeutics', change: 6.8, sentiment: 'bullish', themeRelevance: 'First CRISPR gene therapy approved for sickle cell.' },
      { symbol: 'BEAM', name: 'Beam Therapeutics', change: 7.2, sentiment: 'bullish', themeRelevance: 'Base editing technology for precision corrections.' },
      { symbol: 'VERV', name: 'Verve Therapeutics', change: 9.1, sentiment: 'bullish', themeRelevance: 'Gene editing for cardiovascular disease.' },
    ],
    [
      { title: 'FDA approves first CRISPR-based gene therapy', source: 'FDA', time: '2h ago' },
    ]
  ),
  createTheme(
    'medical-devices-ai',
    'AI-Enhanced Medical Devices',
    'Medical devices incorporating AI for improved diagnostics.',
    'Medical devices are increasingly incorporating AI algorithms for improved accuracy in diagnosis, monitoring, and treatment. Regulatory pathways for AI/ML-enabled devices are maturing.',
    Microscope,
    'Healthcare',
    [
      { symbol: 'ISRG', name: 'Intuitive Surgical', change: 2.8, sentiment: 'bullish', themeRelevance: 'AI-enhanced surgical robotics.' },
      { symbol: 'DXCM', name: 'DexCom', change: 3.4, sentiment: 'bullish', themeRelevance: 'Continuous glucose monitoring with AI predictions.' },
      { symbol: 'MDT', name: 'Medtronic', change: 1.2, sentiment: 'neutral', themeRelevance: 'AI integration across device portfolio.' },
    ],
    [
      { title: 'FDA clears 50+ AI medical devices in 2025', source: 'MedTech Dive', time: '3h ago' },
    ]
  ),
  createTheme(
    'longevity-science',
    'Longevity & Anti-Aging',
    'Scientific advances targeting biological aging processes.',
    'Research into the mechanisms of aging is accelerating, with companies developing interventions targeting senescence, inflammation, and metabolic dysfunction. The field is attracting significant investment.',
    Heart,
    'Healthcare',
    [
      { symbol: 'ABBV', name: 'AbbVie', change: 1.5, sentiment: 'neutral', themeRelevance: 'Research into aging-related conditions.' },
      { symbol: 'NVO', name: 'Novo Nordisk', change: 3.2, sentiment: 'bullish', themeRelevance: 'GLP-1s showing longevity benefits.' },
    ],
    [
      { title: 'Longevity biotech raises record funding', source: 'BioPharma Dive', time: '4h ago' },
    ]
  ),

  // === ENERGY (40+ themes) ===
  createTheme(
    'clean-energy-transition',
    'Clean Energy Transition',
    'Renewable infrastructure spending accelerating globally.',
    'The global transition from fossil fuels to renewable energy represents one of the largest capital reallocation events in history. Solar, wind, and battery storage are seeing massive investment.',
    Leaf,
    'Energy',
    [
      { symbol: 'ENPH', name: 'Enphase Energy', change: 5.3, sentiment: 'bullish', themeRelevance: 'Residential solar microinverters leader.' },
      { symbol: 'FSLR', name: 'First Solar', change: 3.9, sentiment: 'bullish', themeRelevance: 'US-based utility-scale solar manufacturer.' },
      { symbol: 'NEE', name: 'NextEra Energy', change: 1.2, sentiment: 'neutral', themeRelevance: 'Largest renewable energy generator.' },
    ],
    [
      { title: 'US solar installations hit record high', source: 'CNBC', time: '3h ago' },
    ]
  ),
  createTheme(
    'nuclear-renaissance',
    'Nuclear Renaissance',
    'Nuclear power regaining favor as clean baseload energy.',
    'Nuclear energy is experiencing renewed interest as countries seek reliable clean energy. Small modular reactors and advanced designs are attracting investment, while existing plants are seeing life extensions.',
    Zap,
    'Energy',
    [
      { symbol: 'CEG', name: 'Constellation Energy', change: 8.4, sentiment: 'bullish', themeRelevance: 'Largest nuclear fleet owner in US.' },
      { symbol: 'VST', name: 'Vistra Corp', change: 12.1, sentiment: 'bullish', themeRelevance: 'Nuclear plants benefiting from AI power demand.' },
      { symbol: 'NNE', name: 'Nano Nuclear', change: 15.3, sentiment: 'bullish', themeRelevance: 'Micro reactor development.' },
      { symbol: 'SMR', name: 'NuScale Power', change: 9.8, sentiment: 'bullish', themeRelevance: 'Small modular reactor technology leader.' },
    ],
    [
      { title: 'Microsoft signs nuclear deal with Constellation', source: 'Bloomberg', time: '2h ago' },
    ]
  ),
  createTheme(
    'green-hydrogen',
    'Green Hydrogen Economy',
    'Hydrogen emerging as clean fuel for hard-to-decarbonize sectors.',
    'Green hydrogen produced from renewable energy is emerging as a solution for decarbonizing heavy industry, shipping, and aviation. Infrastructure buildout is accelerating despite cost challenges.',
    Droplets,
    'Energy',
    [
      { symbol: 'PLUG', name: 'Plug Power', change: 4.2, sentiment: 'bullish', themeRelevance: 'Green hydrogen production and fuel cells.' },
      { symbol: 'BE', name: 'Bloom Energy', change: 3.8, sentiment: 'bullish', themeRelevance: 'Solid oxide fuel cells for clean power.' },
      { symbol: 'FCEL', name: 'FuelCell Energy', change: 5.1, sentiment: 'bullish', themeRelevance: 'Fuel cell power generation.' },
    ],
    [
      { title: 'EU announces €10B hydrogen infrastructure plan', source: 'Reuters', time: '4h ago' },
    ]
  ),
  createTheme(
    'battery-storage',
    'Grid Battery Storage',
    'Utility-scale batteries enabling renewable integration.',
    'Battery energy storage systems are essential for integrating variable renewable energy into the grid. Costs are declining rapidly while deployment is accelerating.',
    Zap,
    'Energy',
    [
      { symbol: 'FLNC', name: 'Fluence Energy', change: 6.2, sentiment: 'bullish', themeRelevance: 'Utility-scale battery storage systems.' },
      { symbol: 'SEDG', name: 'SolarEdge', change: 4.1, sentiment: 'neutral', themeRelevance: 'Solar inverters with storage integration.' },
      { symbol: 'STEM', name: 'Stem Inc', change: 5.8, sentiment: 'bullish', themeRelevance: 'AI-powered energy storage optimization.' },
    ],
    [
      { title: 'Battery storage installations triple year-over-year', source: 'BNEF', time: '3h ago' },
    ]
  ),
  createTheme(
    'lng-exports',
    'LNG Export Boom',
    'Natural gas exports surging as Europe diversifies supply.',
    'US LNG exports are reaching record levels as Europe seeks alternatives to Russian gas. New export terminals are under construction to meet growing global demand.',
    Factory,
    'Energy',
    [
      { symbol: 'LNG', name: 'Cheniere Energy', change: 2.8, sentiment: 'bullish', themeRelevance: 'Largest US LNG exporter.' },
      { symbol: 'NEXT', name: 'NextDecade', change: 5.4, sentiment: 'bullish', themeRelevance: 'Rio Grande LNG project progressing.' },
      { symbol: 'GLNG', name: 'Golar LNG', change: 3.2, sentiment: 'bullish', themeRelevance: 'Floating LNG infrastructure.' },
    ],
    [
      { title: 'US LNG exports hit record 15 Bcf/d', source: 'EIA', time: '2h ago' },
    ]
  ),
  createTheme(
    'carbon-capture',
    'Carbon Capture Tech',
    'CCUS technology scaling with policy support.',
    'Carbon capture, utilization, and storage technology is receiving significant policy support and investment. The 45Q tax credit is driving project development across the US.',
    Wind,
    'Energy',
    [
      { symbol: 'OXY', name: 'Occidental Petroleum', change: 2.1, sentiment: 'bullish', themeRelevance: 'Leading direct air capture investment.' },
      { symbol: 'XOM', name: 'Exxon Mobil', change: 1.4, sentiment: 'neutral', themeRelevance: 'CCS hubs under development.' },
    ],
    [
      { title: 'Largest carbon capture facility opens in Texas', source: 'WSJ', time: '5h ago' },
    ]
  ),
  createTheme(
    'ev-charging',
    'EV Charging Infrastructure',
    'Charging networks expanding to support EV adoption.',
    'The buildout of EV charging infrastructure is accelerating to support growing electric vehicle adoption. Fast charging networks and home charging solutions are seeing strong demand.',
    Zap,
    'Energy',
    [
      { symbol: 'CHPT', name: 'ChargePoint', change: 4.2, sentiment: 'bullish', themeRelevance: 'Largest EV charging network in North America.' },
      { symbol: 'EVGO', name: 'EVgo Inc', change: 5.8, sentiment: 'bullish', themeRelevance: 'Fast charging network expansion.' },
      { symbol: 'BLNK', name: 'Blink Charging', change: 3.4, sentiment: 'neutral', themeRelevance: 'Commercial and residential charging.' },
    ],
    [
      { title: 'US adds 20,000 public chargers in Q4', source: 'DOE', time: '3h ago' },
    ]
  ),

  // === FINANCIALS (40+ themes) ===
  createTheme(
    'fed-rate-pivot',
    'Fed Rate Pivot Trade',
    'Markets pricing in rate cuts benefiting duration assets.',
    'After aggressive tightening, markets are anticipating Fed rate cuts. Duration-sensitive assets like bonds and growth stocks tend to benefit from falling rates.',
    TrendingUp,
    'Macro',
    [
      { symbol: 'TLT', name: 'iShares 20+ Year Treasury', change: 1.8, sentiment: 'bullish', themeRelevance: 'Long-duration bonds benefit from rate cuts.' },
      { symbol: 'XLF', name: 'Financial Select Sector', change: 2.1, sentiment: 'bullish', themeRelevance: 'Banks positioned for improved loan demand.' },
      { symbol: 'KRE', name: 'SPDR Regional Banking', change: 3.4, sentiment: 'bullish', themeRelevance: 'Regional banks see deposit stabilization.' },
    ],
    [
      { title: 'Fed signals openness to rate cuts', source: 'WSJ', time: '1h ago' },
    ]
  ),
  createTheme(
    'fintech-disruption',
    'Fintech Disruption',
    'Digital finance transforming traditional banking services.',
    'Fintech companies are capturing market share from traditional banks in payments, lending, and wealth management. Embedded finance is enabling non-financial companies to offer financial services.',
    CreditCard,
    'Financials',
    [
      { symbol: 'SQ', name: 'Block Inc', change: 4.2, sentiment: 'bullish', themeRelevance: 'Cash App and Square ecosystem growth.' },
      { symbol: 'PYPL', name: 'PayPal', change: 2.8, sentiment: 'neutral', themeRelevance: 'Digital payments and Venmo platform.' },
      { symbol: 'SOFI', name: 'SoFi Technologies', change: 6.1, sentiment: 'bullish', themeRelevance: 'Digital banking and lending platform.' },
      { symbol: 'AFRM', name: 'Affirm Holdings', change: 5.4, sentiment: 'bullish', themeRelevance: 'Buy-now-pay-later leader.' },
    ],
    [
      { title: 'Fintech sector sees record user growth', source: 'CNBC', time: '4h ago' },
    ]
  ),
  createTheme(
    'crypto-institutional',
    'Crypto Institutional Adoption',
    'Bitcoin ETFs driving institutional crypto investment.',
    'The approval of spot Bitcoin ETFs has opened cryptocurrency investment to traditional financial institutions. Asset managers are adding crypto exposure to portfolios.',
    Coins,
    'Financials',
    [
      { symbol: 'COIN', name: 'Coinbase', change: 8.4, sentiment: 'bullish', themeRelevance: 'Leading US crypto exchange and custody.' },
      { symbol: 'MSTR', name: 'MicroStrategy', change: 12.1, sentiment: 'bullish', themeRelevance: 'Largest corporate Bitcoin holder.' },
      { symbol: 'RIOT', name: 'Riot Platforms', change: 9.2, sentiment: 'bullish', themeRelevance: 'Bitcoin mining infrastructure.' },
    ],
    [
      { title: 'Bitcoin ETFs see $10B inflows in first month', source: 'Bloomberg', time: '2h ago' },
    ]
  ),
  createTheme(
    'insurance-tech',
    'InsurTech Innovation',
    'AI transforming insurance underwriting and claims.',
    'Insurance companies are using AI and data analytics to improve underwriting accuracy, detect fraud, and streamline claims processing. Digital-first insurers are gaining market share.',
    Shield,
    'Financials',
    [
      { symbol: 'LMND', name: 'Lemonade', change: 5.8, sentiment: 'bullish', themeRelevance: 'AI-first insurance platform.' },
      { symbol: 'ROOT', name: 'Root Inc', change: 7.2, sentiment: 'bullish', themeRelevance: 'Telematics-based auto insurance.' },
      { symbol: 'OSCR', name: 'Oscar Health', change: 4.1, sentiment: 'neutral', themeRelevance: 'Tech-enabled health insurance.' },
    ],
    [
      { title: 'InsurTech funding rebounds in Q1', source: 'Insurance Journal', time: '5h ago' },
    ]
  ),
  createTheme(
    'private-credit',
    'Private Credit Boom',
    'Private credit filling gap left by bank retreat.',
    'Private credit has grown rapidly as banks pulled back from certain lending markets. Alternative asset managers are deploying capital into direct lending and structured credit.',
    Banknote,
    'Financials',
    [
      { symbol: 'APO', name: 'Apollo Global', change: 3.2, sentiment: 'bullish', themeRelevance: 'Leading private credit manager.' },
      { symbol: 'ARES', name: 'Ares Management', change: 2.8, sentiment: 'bullish', themeRelevance: 'Direct lending and credit strategies.' },
      { symbol: 'KKR', name: 'KKR & Co', change: 2.4, sentiment: 'bullish', themeRelevance: 'Expanding credit platform.' },
    ],
    [
      { title: 'Private credit AUM reaches $2 trillion', source: 'FT', time: '3h ago' },
    ]
  ),
  createTheme(
    'wealth-tech',
    'Wealth Tech Platform',
    'Digital wealth management democratizing investing.',
    'Robo-advisors and digital wealth platforms are making sophisticated investment strategies accessible to retail investors. The shift is pressuring traditional wealth managers.',
    BarChart3,
    'Financials',
    [
      { symbol: 'SCHW', name: 'Charles Schwab', change: 2.1, sentiment: 'bullish', themeRelevance: 'Digital brokerage and wealth platform.' },
      { symbol: 'MS', name: 'Morgan Stanley', change: 1.8, sentiment: 'neutral', themeRelevance: 'E*Trade integration driving growth.' },
      { symbol: 'IBKR', name: 'Interactive Brokers', change: 2.5, sentiment: 'bullish', themeRelevance: 'Advanced trading technology.' },
    ],
    [
      { title: 'Robo-advisor assets exceed $1 trillion', source: 'Bloomberg', time: '4h ago' },
    ]
  ),

  // === CONSUMER (40+ themes) ===
  createTheme(
    'ecommerce-evolution',
    'E-Commerce Evolution',
    'Retail digitization accelerating with AI personalization.',
    'E-commerce continues to gain market share with AI-powered personalization, faster delivery, and improved experiences. Social commerce and live shopping are emerging growth drivers.',
    ShoppingCart,
    'Consumer',
    [
      { symbol: 'AMZN', name: 'Amazon', change: 2.4, sentiment: 'bullish', themeRelevance: 'E-commerce and logistics dominance.' },
      { symbol: 'SHOP', name: 'Shopify', change: 4.2, sentiment: 'bullish', themeRelevance: 'Merchant platform powering SMB e-commerce.' },
      { symbol: 'MELI', name: 'MercadoLibre', change: 3.8, sentiment: 'bullish', themeRelevance: 'Latin American e-commerce leader.' },
    ],
    [
      { title: 'E-commerce penetration reaches 25%', source: 'Census Bureau', time: '2h ago' },
    ]
  ),
  createTheme(
    'streaming-wars',
    'Streaming Consolidation',
    'Media companies bundling and raising prices.',
    'The streaming landscape is consolidating as companies focus on profitability over subscriber growth. Bundling, ad tiers, and password sharing crackdowns are driving revenue improvement.',
    Tv,
    'Consumer',
    [
      { symbol: 'NFLX', name: 'Netflix', change: 3.1, sentiment: 'bullish', themeRelevance: 'Streaming leader with ad tier success.' },
      { symbol: 'DIS', name: 'Walt Disney', change: 1.8, sentiment: 'neutral', themeRelevance: 'Disney+ and Hulu bundling.' },
      { symbol: 'WBD', name: 'Warner Bros Discovery', change: 2.4, sentiment: 'neutral', themeRelevance: 'Max streaming platform.' },
    ],
    [
      { title: 'Netflix adds 10M subscribers on ad tier', source: 'Variety', time: '3h ago' },
    ]
  ),
  createTheme(
    'luxury-resilience',
    'Luxury Spending Resilience',
    'High-end brands outperforming broader retail.',
    'Luxury goods companies are demonstrating pricing power and resilient demand despite economic uncertainty. Wealthy consumers continue spending on premium experiences and products.',
    Sparkles,
    'Consumer',
    [
      { symbol: 'LVMH', name: 'LVMH', change: 2.8, sentiment: 'bullish', themeRelevance: 'Global luxury conglomerate leader.' },
      { symbol: 'RMS', name: 'Hermès', change: 3.2, sentiment: 'bullish', themeRelevance: 'Ultra-luxury with exceptional margins.' },
      { symbol: 'CPRI', name: 'Capri Holdings', change: 1.5, sentiment: 'neutral', themeRelevance: 'Versace and Jimmy Choo brands.' },
    ],
    [
      { title: 'Luxury sector outperforms in Q1', source: 'WWD', time: '4h ago' },
    ]
  ),
  createTheme(
    'gaming-metaverse',
    'Gaming & Virtual Worlds',
    'Gaming platforms evolving into social metaverse spaces.',
    'Gaming is evolving beyond entertainment into social platforms and virtual economies. User-generated content, esports, and virtual goods are driving engagement and monetization.',
    Gamepad2,
    'Consumer',
    [
      { symbol: 'RBLX', name: 'Roblox', change: 5.4, sentiment: 'bullish', themeRelevance: 'User-generated gaming platform.' },
      { symbol: 'TTWO', name: 'Take-Two Interactive', change: 2.8, sentiment: 'bullish', themeRelevance: 'GTA franchise and sports titles.' },
      { symbol: 'EA', name: 'Electronic Arts', change: 1.9, sentiment: 'neutral', themeRelevance: 'Sports gaming dominance.' },
      { symbol: 'U', name: 'Unity Software', change: 4.2, sentiment: 'bullish', themeRelevance: 'Game development platform.' },
    ],
    [
      { title: 'Gaming revenue exceeds $200B globally', source: 'Newzoo', time: '2h ago' },
    ]
  ),
  createTheme(
    'sports-betting',
    'Sports Betting Expansion',
    'Legal sports betting spreading across US states.',
    'The legalization of sports betting continues to expand across US states, driving growth for operators and technology providers. Mobile betting dominates the market.',
    TrendingUp,
    'Consumer',
    [
      { symbol: 'DKNG', name: 'DraftKings', change: 6.2, sentiment: 'bullish', themeRelevance: 'Leading US sports betting platform.' },
      { symbol: 'FLUT', name: 'Flutter Entertainment', change: 3.8, sentiment: 'bullish', themeRelevance: 'FanDuel parent company.' },
      { symbol: 'MGM', name: 'MGM Resorts', change: 2.4, sentiment: 'bullish', themeRelevance: 'BetMGM sports betting.' },
    ],
    [
      { title: 'US sports betting handle reaches $10B monthly', source: 'ESPN', time: '3h ago' },
    ]
  ),
  createTheme(
    'pet-economy',
    'Pet Economy Boom',
    'Pet spending reaching record levels.',
    'Americans are spending more on their pets than ever, driving growth in premium pet food, veterinary care, and pet services. The trend accelerated during the pandemic and has sustained.',
    Heart,
    'Consumer',
    [
      { symbol: 'CHWY', name: 'Chewy', change: 4.8, sentiment: 'bullish', themeRelevance: 'Leading online pet retailer.' },
      { symbol: 'WOOF', name: 'Petco Health', change: 2.1, sentiment: 'neutral', themeRelevance: 'Pet retail and veterinary services.' },
      { symbol: 'IDXX', name: 'IDEXX Labs', change: 3.2, sentiment: 'bullish', themeRelevance: 'Veterinary diagnostics leader.' },
    ],
    [
      { title: 'Pet industry spending exceeds $150B', source: 'APPA', time: '5h ago' },
    ]
  ),

  // === INDUSTRIALS (40+ themes) ===
  createTheme(
    'defense-modernization',
    'Defense Modernization',
    'Geopolitical tensions driving defense spending.',
    'Heightened geopolitical tensions are driving sustained increases in global defense spending. NATO allies are accelerating efforts to meet spending targets while Asia expands military capabilities.',
    Shield,
    'Industrials',
    [
      { symbol: 'LMT', name: 'Lockheed Martin', change: 2.8, sentiment: 'bullish', themeRelevance: 'F-35 program leader with strong backlog.' },
      { symbol: 'RTX', name: 'RTX Corporation', change: 1.9, sentiment: 'bullish', themeRelevance: 'Patriot missile systems in high demand.' },
      { symbol: 'NOC', name: 'Northrop Grumman', change: 2.2, sentiment: 'bullish', themeRelevance: 'B-21 bomber and nuclear modernization.' },
      { symbol: 'GD', name: 'General Dynamics', change: 1.5, sentiment: 'neutral', themeRelevance: 'Nuclear submarine backlog strength.' },
    ],
    [
      { title: 'Pentagon awards $15B in defense contracts', source: 'Defense News', time: '2h ago' },
    ]
  ),
  createTheme(
    'reshoring-manufacturing',
    'US Manufacturing Reshoring',
    'Companies bringing production back to US.',
    'Supply chain disruptions and geopolitical concerns are driving companies to reshore manufacturing to the US. Industrial automation is enabling cost-competitive domestic production.',
    Factory,
    'Industrials',
    [
      { symbol: 'CAT', name: 'Caterpillar', change: 2.4, sentiment: 'bullish', themeRelevance: 'Construction equipment for factory buildout.' },
      { symbol: 'ROK', name: 'Rockwell Automation', change: 3.1, sentiment: 'bullish', themeRelevance: 'Industrial automation solutions.' },
      { symbol: 'EMR', name: 'Emerson Electric', change: 2.2, sentiment: 'bullish', themeRelevance: 'Factory automation technology.' },
    ],
    [
      { title: 'US manufacturing construction spending hits record', source: 'Census Bureau', time: '3h ago' },
    ]
  ),
  createTheme(
    'logistics-automation',
    'Logistics Automation',
    'Warehouses deploying robots and AI optimization.',
    'E-commerce growth is driving investment in warehouse automation. Robots, autonomous vehicles, and AI-powered optimization are transforming logistics operations.',
    Truck,
    'Industrials',
    [
      { symbol: 'AMZN', name: 'Amazon', change: 2.1, sentiment: 'bullish', themeRelevance: 'Massive robotics deployment in fulfillment.' },
      { symbol: 'PCAR', name: 'PACCAR', change: 1.8, sentiment: 'neutral', themeRelevance: 'Heavy-duty trucks for logistics.' },
      { symbol: 'XPO', name: 'XPO Inc', change: 3.4, sentiment: 'bullish', themeRelevance: 'Technology-enabled freight services.' },
    ],
    [
      { title: 'Warehouse robots installations up 50%', source: 'Robotics Business Review', time: '4h ago' },
    ]
  ),
  createTheme(
    'space-economy',
    'Space Economy Expansion',
    'Commercial space industry reaching scale.',
    'The commercial space industry is entering a period of rapid growth. Satellite internet, space tourism, and in-space manufacturing are creating new markets.',
    Plane,
    'Industrials',
    [
      { symbol: 'RKLB', name: 'Rocket Lab', change: 8.4, sentiment: 'bullish', themeRelevance: 'Small satellite launch and space systems.' },
      { symbol: 'LMT', name: 'Lockheed Martin', change: 2.1, sentiment: 'bullish', themeRelevance: 'Space systems and satellite manufacturing.' },
      { symbol: 'NOC', name: 'Northrop Grumman', change: 2.4, sentiment: 'bullish', themeRelevance: 'Space propulsion and satellites.' },
    ],
    [
      { title: 'SpaceX launches 50th Starlink mission', source: 'SpaceNews', time: '2h ago' },
    ]
  ),
  createTheme(
    'infrastructure-spending',
    'Infrastructure Investment',
    'IIJA funding flowing to projects.',
    'The Infrastructure Investment and Jobs Act is driving increased spending on roads, bridges, broadband, and grid infrastructure. Multi-year funding visibility supports construction companies.',
    Building2,
    'Industrials',
    [
      { symbol: 'VMC', name: 'Vulcan Materials', change: 2.8, sentiment: 'bullish', themeRelevance: 'Aggregates for construction projects.' },
      { symbol: 'MLM', name: 'Martin Marietta', change: 2.4, sentiment: 'bullish', themeRelevance: 'Building materials supplier.' },
      { symbol: 'PWR', name: 'Quanta Services', change: 3.2, sentiment: 'bullish', themeRelevance: 'Utility infrastructure contractor.' },
    ],
    [
      { title: 'IIJA spending reaches $100B in 2025', source: 'DOT', time: '3h ago' },
    ]
  ),
  createTheme(
    'aviation-recovery',
    'Aviation Recovery',
    'Air travel demand exceeding pre-pandemic levels.',
    'Global air travel has recovered and exceeded pre-pandemic levels. Airlines are expanding capacity and placing large aircraft orders. Business travel is also recovering.',
    Plane,
    'Industrials',
    [
      { symbol: 'BA', name: 'Boeing', change: 2.8, sentiment: 'neutral', themeRelevance: 'Aircraft manufacturer with strong backlog.' },
      { symbol: 'UAL', name: 'United Airlines', change: 3.4, sentiment: 'bullish', themeRelevance: 'International travel recovery leader.' },
      { symbol: 'DAL', name: 'Delta Air Lines', change: 2.9, sentiment: 'bullish', themeRelevance: 'Premium travel segment strength.' },
    ],
    [
      { title: 'TSA screens record passengers', source: 'TSA', time: '2h ago' },
    ]
  ),

  // === REAL ESTATE (25+ themes) ===
  createTheme(
    'data-center-reits',
    'Data Center REITs',
    'AI driving data center demand and valuations.',
    'Data center REITs are benefiting from surging demand for AI compute capacity. Hyperscalers are signing long-term leases and valuations are expanding.',
    Database,
    'Real Estate',
    [
      { symbol: 'EQIX', name: 'Equinix', change: 3.8, sentiment: 'bullish', themeRelevance: 'Global data center leader with interconnection focus.' },
      { symbol: 'DLR', name: 'Digital Realty', change: 4.2, sentiment: 'bullish', themeRelevance: 'Hyperscale data center development.' },
      { symbol: 'AMT', name: 'American Tower', change: 2.1, sentiment: 'bullish', themeRelevance: 'Tower and data center infrastructure.' },
    ],
    [
      { title: 'Data center vacancy at record lows', source: 'JLL', time: '3h ago' },
    ]
  ),
  createTheme(
    'industrial-logistics',
    'Industrial Logistics REITs',
    'E-commerce driving warehouse demand.',
    'Industrial logistics real estate remains in strong demand as e-commerce growth drives need for fulfillment and distribution space. Supply is struggling to keep pace.',
    Package,
    'Real Estate',
    [
      { symbol: 'PLD', name: 'Prologis', change: 2.4, sentiment: 'bullish', themeRelevance: 'Global logistics real estate leader.' },
      { symbol: 'STAG', name: 'STAG Industrial', change: 1.8, sentiment: 'bullish', themeRelevance: 'Single-tenant industrial properties.' },
      { symbol: 'REXR', name: 'Rexford Industrial', change: 2.9, sentiment: 'bullish', themeRelevance: 'Infill Southern California industrial.' },
    ],
    [
      { title: 'Industrial vacancy remains below 4%', source: 'CBRE', time: '4h ago' },
    ]
  ),
  createTheme(
    'housing-shortage',
    'Housing Supply Crisis',
    'Chronic housing undersupply driving homebuilder demand.',
    'The US faces a significant housing shortage, driving strong demand for new construction. Homebuilders are benefiting despite higher mortgage rates.',
    Home,
    'Real Estate',
    [
      { symbol: 'DHI', name: 'D.R. Horton', change: 2.8, sentiment: 'bullish', themeRelevance: 'Largest US homebuilder by volume.' },
      { symbol: 'LEN', name: 'Lennar', change: 2.4, sentiment: 'bullish', themeRelevance: 'National homebuilder with diversified markets.' },
      { symbol: 'TOL', name: 'Toll Brothers', change: 3.1, sentiment: 'bullish', themeRelevance: 'Luxury homebuilder segment leader.' },
    ],
    [
      { title: 'US housing shortage exceeds 4 million units', source: 'NAR', time: '2h ago' },
    ]
  ),
  createTheme(
    'senior-housing',
    'Senior Housing Recovery',
    'Aging demographics driving senior housing demand.',
    'Senior housing occupancy is recovering as demographics favor the sector. The aging baby boomer population is driving demand for assisted living and memory care facilities.',
    Users,
    'Real Estate',
    [
      { symbol: 'WELL', name: 'Welltower', change: 3.2, sentiment: 'bullish', themeRelevance: 'Leading senior housing REIT.' },
      { symbol: 'VTR', name: 'Ventas', change: 2.8, sentiment: 'bullish', themeRelevance: 'Healthcare and senior housing properties.' },
    ],
    [
      { title: 'Senior housing occupancy exceeds 85%', source: 'NIC', time: '3h ago' },
    ]
  ),

  // === COMMODITIES (25+ themes) ===
  createTheme(
    'copper-supercycle',
    'Copper Supercycle',
    'Electrification driving copper demand surge.',
    'Copper demand is surging due to electric vehicles, renewable energy, and grid infrastructure. Supply constraints are emerging as mines age and new projects face permitting challenges.',
    Mountain,
    'Commodities',
    [
      { symbol: 'FCX', name: 'Freeport-McMoRan', change: 4.2, sentiment: 'bullish', themeRelevance: 'Leading copper producer with expanding operations.' },
      { symbol: 'SCCO', name: 'Southern Copper', change: 3.8, sentiment: 'bullish', themeRelevance: 'Low-cost copper production in Americas.' },
      { symbol: 'TECK', name: 'Teck Resources', change: 2.9, sentiment: 'bullish', themeRelevance: 'Copper growth projects coming online.' },
    ],
    [
      { title: 'Copper prices hit 2-year high on supply concerns', source: 'Bloomberg', time: '2h ago' },
    ]
  ),
  createTheme(
    'gold-safe-haven',
    'Gold Safe Haven Rally',
    'Geopolitical uncertainty driving gold demand.',
    'Central bank buying and geopolitical uncertainty are supporting gold prices. Emerging market central banks are diversifying reserves away from the dollar.',
    Coins,
    'Commodities',
    [
      { symbol: 'NEM', name: 'Newmont Corporation', change: 3.4, sentiment: 'bullish', themeRelevance: 'Largest gold producer globally.' },
      { symbol: 'GOLD', name: 'Barrick Gold', change: 2.8, sentiment: 'bullish', themeRelevance: 'Tier-1 gold assets and copper exposure.' },
      { symbol: 'GDX', name: 'VanEck Gold Miners ETF', change: 3.1, sentiment: 'bullish', themeRelevance: 'Broad gold miner exposure.' },
    ],
    [
      { title: 'Gold hits record high above $2,500', source: 'Reuters', time: '1h ago' },
    ]
  ),
  createTheme(
    'lithium-dynamics',
    'Lithium Market Dynamics',
    'Battery demand driving lithium investment cycle.',
    'Lithium markets are navigating a volatile cycle as EV demand growth meets supply expansion. Price volatility is driving investment in new extraction technologies and recycling.',
    Beaker,
    'Commodities',
    [
      { symbol: 'ALB', name: 'Albemarle', change: -2.4, sentiment: 'bearish', themeRelevance: 'Major lithium producer facing price pressure.' },
      { symbol: 'LTHM', name: 'Livent', change: -1.8, sentiment: 'bearish', themeRelevance: 'Pure-play lithium producer.' },
      { symbol: 'SQM', name: 'Sociedad Química', change: -1.2, sentiment: 'neutral', themeRelevance: 'Chilean lithium and fertilizer producer.' },
    ],
    [
      { title: 'Lithium prices stabilize after 60% decline', source: 'S&P Global', time: '4h ago' },
    ]
  ),
  createTheme(
    'agricultural-innovation',
    'Agricultural Technology',
    'Precision agriculture improving crop yields.',
    'Agricultural technology is transforming farming with precision application, autonomous equipment, and data analytics. Climate change is increasing the urgency of yield improvements.',
    Wheat,
    'Commodities',
    [
      { symbol: 'DE', name: 'Deere & Company', change: 2.4, sentiment: 'bullish', themeRelevance: 'Precision agriculture and autonomous equipment.' },
      { symbol: 'AGCO', name: 'AGCO Corporation', change: 1.8, sentiment: 'neutral', themeRelevance: 'Smart farming technology solutions.' },
      { symbol: 'CF', name: 'CF Industries', change: 2.1, sentiment: 'bullish', themeRelevance: 'Nitrogen fertilizers for improved yields.' },
    ],
    [
      { title: 'Precision agriculture market grows 15% annually', source: 'AgFunder', time: '3h ago' },
    ]
  ),
  createTheme(
    'water-scarcity',
    'Water Scarcity Solutions',
    'Water infrastructure investment accelerating.',
    'Water scarcity is driving investment in treatment, distribution, and conservation technologies. Aging infrastructure and climate change are creating urgency for water solutions.',
    Droplets,
    'Commodities',
    [
      { symbol: 'XYL', name: 'Xylem Inc', change: 2.8, sentiment: 'bullish', themeRelevance: 'Water technology solutions provider.' },
      { symbol: 'AWK', name: 'American Water Works', change: 1.9, sentiment: 'bullish', themeRelevance: 'Largest US water utility.' },
      { symbol: 'WTRG', name: 'Essential Utilities', change: 1.5, sentiment: 'neutral', themeRelevance: 'Water and wastewater services.' },
    ],
    [
      { title: 'Water infrastructure spending bill advances', source: 'WSJ', time: '5h ago' },
    ]
  ),

  // === Additional themes to reach 300+ ===
  ...generateAdditionalThemes(),
];

// Helper function to generate many more themes
function generateAdditionalThemes(): MarketTheme[] {
  const additionalThemes: MarketTheme[] = [];
  
  const themeTemplates = [
    // Technology expansion
    { id: 'ai-coding', title: 'AI-Powered Coding', summary: 'Developer tools transforming software creation.', category: 'Technology', icon: Cpu, tickers: ['MSFT', 'GOOGL', 'CRM'] },
    { id: 'blockchain-enterprise', title: 'Enterprise Blockchain', summary: 'Distributed ledger adoption in financial services.', category: 'Technology', icon: Database, tickers: ['IBM', 'ORCL', 'COIN'] },
    { id: 'ai-chips-arms-race', title: 'AI Chips Arms Race', summary: 'Competition intensifies for AI accelerator market.', category: 'Technology', icon: Cpu, tickers: ['NVDA', 'AMD', 'INTC', 'AVGO'] },
    { id: 'software-vertical', title: 'Vertical SaaS Growth', summary: 'Industry-specific software gaining traction.', category: 'Technology', icon: Cloud, tickers: ['VEEV', 'PCTY', 'BILL'] },
    { id: 'devops-platforms', title: 'DevOps Platform Consolidation', summary: 'Developer platforms consolidating fragmented tooling.', category: 'Technology', icon: Database, tickers: ['GTLB', 'ESTC', 'MDB'] },
    { id: 'ai-voice', title: 'Voice AI Revolution', summary: 'Voice interfaces becoming mainstream with AI.', category: 'Technology', icon: Megaphone, tickers: ['AAPL', 'GOOGL', 'AMZN'] },
    { id: 'synthetic-data', title: 'Synthetic Data Generation', summary: 'AI-generated data enabling model training.', category: 'Technology', icon: Database, tickers: ['SNOW', 'PLTR', 'PATH'] },
    { id: 'computer-vision', title: 'Computer Vision Applications', summary: 'Visual AI transforming retail and manufacturing.', category: 'Technology', icon: Eye, tickers: ['NVDA', 'GOOGL', 'AMZN'] },
    { id: 'satellite-internet', title: 'Satellite Internet Expansion', summary: 'LEO satellite constellations providing global coverage.', category: 'Technology', icon: Globe, tickers: ['GSAT', 'ASTS', 'RKLB'] },
    { id: 'ai-music', title: 'AI Music Generation', summary: 'Generative AI creating and producing music.', category: 'Technology', icon: Music, tickers: ['SPOT', 'UMG', 'WMG'] },
    
    // Healthcare expansion
    { id: 'alzheimers-treatments', title: 'Alzheimer Disease Breakthroughs', summary: 'New treatments showing disease modification.', category: 'Healthcare', icon: Brain, tickers: ['LLY', 'BIIB', 'RHHBY'] },
    { id: 'cell-therapy', title: 'Cell Therapy Advancement', summary: 'CAR-T and cell therapies expanding indications.', category: 'Healthcare', icon: Microscope, tickers: ['KITE', 'BLUE', 'FATE'] },
    { id: 'surgical-robots', title: 'Surgical Robotics', summary: 'Robotic surgery expanding beyond urology.', category: 'Healthcare', icon: Cpu, tickers: ['ISRG', 'MDT', 'SYK'] },
    { id: 'rare-disease', title: 'Rare Disease Focus', summary: 'Orphan drugs commanding premium pricing.', category: 'Healthcare', icon: Dna, tickers: ['VRTX', 'ALNY', 'BMRN'] },
    { id: 'biosimilars-growth', title: 'Biosimilars Market Growth', summary: 'Biosimilar competition reducing drug costs.', category: 'Healthcare', icon: Beaker, tickers: ['AMGN', 'PFE', 'TEVA'] },
    { id: 'mental-health-tech', title: 'Mental Health Technology', summary: 'Digital mental health solutions gaining adoption.', category: 'Healthcare', icon: Brain, tickers: ['TALK', 'TDOC', 'AMWL'] },
    { id: 'wearable-health', title: 'Wearable Health Monitoring', summary: 'Consumer wearables enabling continuous health tracking.', category: 'Healthcare', icon: Heart, tickers: ['AAPL', 'GRMN', 'DXCM'] },
    { id: 'radiopharmaceuticals', title: 'Radiopharmaceutical Advances', summary: 'Targeted radioligand therapies for cancer.', category: 'Healthcare', icon: Atom, tickers: ['NVS', 'BMY', 'PFE'] },
    
    // Energy expansion
    { id: 'offshore-wind', title: 'Offshore Wind Development', summary: 'Massive offshore wind projects progressing.', category: 'Energy', icon: Wind, tickers: ['NEE', 'ORSTED', 'RWE'] },
    { id: 'geothermal-renaissance', title: 'Geothermal Renaissance', summary: 'Enhanced geothermal systems gaining interest.', category: 'Energy', icon: Thermometer, tickers: ['ORA', 'FSLR', 'AY'] },
    { id: 'energy-storage-tech', title: 'Next-Gen Energy Storage', summary: 'Beyond lithium-ion storage technologies emerging.', category: 'Energy', icon: Zap, tickers: ['FLNC', 'STEM', 'PLUG'] },
    { id: 'smart-grid', title: 'Smart Grid Modernization', summary: 'Grid digitization enabling renewable integration.', category: 'Energy', icon: Zap, tickers: ['ITRI', 'PWR', 'ETN'] },
    { id: 'biofuels-saf', title: 'Sustainable Aviation Fuel', summary: 'SAF production scaling for aviation decarbonization.', category: 'Energy', icon: Plane, tickers: ['DAL', 'UAL', 'NESTE'] },
    { id: 'utility-scale-solar', title: 'Utility-Scale Solar Boom', summary: 'Large solar project pipeline accelerating.', category: 'Energy', icon: Sun, tickers: ['FSLR', 'ENPH', 'ARRY'] },
    { id: 'virtual-power-plants', title: 'Virtual Power Plants', summary: 'Aggregated distributed energy resources.', category: 'Energy', icon: Zap, tickers: ['ENPH', 'RUN', 'SEDG'] },
    
    // Financial expansion
    { id: 'embedded-finance', title: 'Embedded Finance Growth', summary: 'Non-banks offering financial services.', category: 'Financials', icon: CreditCard, tickers: ['SHOP', 'SQ', 'AFRM'] },
    { id: 'wealth-transfer', title: 'Great Wealth Transfer', summary: '$70 trillion generational wealth transfer.', category: 'Financials', icon: Banknote, tickers: ['SCHW', 'MS', 'RJF'] },
    { id: 'payment-modernization', title: 'Real-Time Payments', summary: 'Instant payment systems replacing legacy rails.', category: 'Financials', icon: Zap, tickers: ['FIS', 'GPN', 'JKHY'] },
    { id: 'defi-bridges', title: 'DeFi-TradFi Integration', summary: 'Traditional finance integrating DeFi protocols.', category: 'Financials', icon: Coins, tickers: ['COIN', 'GS', 'BLK'] },
    { id: 'climate-finance', title: 'Climate Finance Surge', summary: 'ESG and climate investment flows accelerating.', category: 'Financials', icon: Leaf, tickers: ['BLK', 'MS', 'GS'] },
    { id: 'neobanks', title: 'Neobank Maturation', summary: 'Digital-only banks achieving profitability.', category: 'Financials', icon: Smartphone, tickers: ['SOFI', 'LC', 'NU'] },
    
    // Consumer expansion
    { id: 'experiential-economy', title: 'Experiential Economy', summary: 'Consumers prioritizing experiences over things.', category: 'Consumer', icon: Globe, tickers: ['BKNG', 'ABNB', 'LYV'] },
    { id: 'gen-z-brands', title: 'Gen Z Brand Preferences', summary: 'Younger consumers reshaping brand landscape.', category: 'Consumer', icon: Users, tickers: ['LULU', 'NKE', 'DECK'] },
    { id: 'plant-based-foods', title: 'Plant-Based Foods 2.0', summary: 'Next generation meat alternatives improving.', category: 'Consumer', icon: Wheat, tickers: ['BYND', 'OTLY', 'TSN'] },
    { id: 'creator-economy', title: 'Creator Economy Expansion', summary: 'Content creators driving platform growth.', category: 'Consumer', icon: Camera, tickers: ['SNAP', 'PINS', 'MTCH'] },
    { id: 'fitness-wellness', title: 'Fitness & Wellness Tech', summary: 'Connected fitness maintaining momentum.', category: 'Consumer', icon: Heart, tickers: ['PTON', 'LULU', 'NKE'] },
    { id: 'social-commerce', title: 'Social Commerce Growth', summary: 'Shopping integrated into social platforms.', category: 'Consumer', icon: ShoppingCart, tickers: ['META', 'PINS', 'SNAP'] },
    { id: 'quick-commerce', title: 'Quick Commerce Race', summary: 'Ultra-fast delivery reshaping retail.', category: 'Consumer', icon: Truck, tickers: ['DASH', 'UBER', 'AMZN'] },
    { id: 'subscription-economy', title: 'Subscription Economy', summary: 'Recurring revenue models spreading.', category: 'Consumer', icon: CreditCard, tickers: ['NFLX', 'SPOT', 'ADBE'] },
    
    // Industrial expansion
    { id: 'electrification-industrial', title: 'Industrial Electrification', summary: 'Manufacturing shifting from fossil fuels.', category: 'Industrials', icon: Zap, tickers: ['ETN', 'EMR', 'ROK'] },
    { id: 'drone-delivery', title: 'Drone Delivery Scale', summary: 'Commercial drone delivery reaching scale.', category: 'Industrials', icon: Plane, tickers: ['AMZN', 'UPS', 'WMT'] },
    { id: 'robotics-labor', title: 'Robotics Addressing Labor', summary: 'Automation solving labor shortage.', category: 'Industrials', icon: Cpu, tickers: ['FANUY', 'ROK', 'ABB'] },
    { id: 'sustainable-packaging', title: 'Sustainable Packaging', summary: 'Plastic alternatives gaining market share.', category: 'Industrials', icon: Package, tickers: ['IP', 'PKG', 'SEE'] },
    { id: 'rail-renaissance', title: 'Rail Infrastructure Revival', summary: 'Rail investment for freight efficiency.', category: 'Industrials', icon: Truck, tickers: ['UNP', 'CSX', 'NSC'] },
    { id: 'hvac-efficiency', title: 'HVAC Modernization', summary: 'Building efficiency driving equipment demand.', category: 'Industrials', icon: Wind, tickers: ['CARR', 'TT', 'JCI'] },
    { id: '3d-printing-manufacturing', title: '3D Printing Adoption', summary: 'Additive manufacturing reaching production scale.', category: 'Industrials', icon: Cpu, tickers: ['DDD', 'SSYS', 'XONE'] },
    
    // More technology themes
    { id: 'edge-computing', title: 'Edge Computing Infrastructure', summary: 'Computing moving closer to data sources.', category: 'Technology', icon: Database, tickers: ['CSCO', 'HPE', 'ANET'] },
    { id: 'api-economy', title: 'API Economy Growth', summary: 'APIs enabling digital transformation.', category: 'Technology', icon: Cloud, tickers: ['TWLO', 'CRM', 'GOOGL'] },
    { id: 'low-code-platforms', title: 'Low-Code Development', summary: 'Visual development tools democratizing coding.', category: 'Technology', icon: Cpu, tickers: ['NOW', 'CRM', 'MSFT'] },
    { id: 'data-privacy', title: 'Data Privacy Tech', summary: 'Privacy regulations driving compliance tech.', category: 'Technology', icon: Lock, tickers: ['ORCL', 'IBM', 'PANW'] },
    { id: 'connected-car', title: 'Connected Car Ecosystem', summary: 'Vehicles becoming software platforms.', category: 'Technology', icon: Car, tickers: ['TSLA', 'APTV', 'MBLY'] },
    { id: 'podcasting-growth', title: 'Podcast Advertising Boom', summary: 'Audio content monetization improving.', category: 'Technology', icon: Radio, tickers: ['SPOT', 'SIRI', 'GOOGL'] },
    { id: 'open-source-ai', title: 'Open Source AI Models', summary: 'Open weights models disrupting AI market.', category: 'Technology', icon: BookOpen, tickers: ['META', 'IBM', 'GOOGL'] },
    { id: 'ai-video', title: 'AI Video Generation', summary: 'Text-to-video AI reaching production quality.', category: 'Technology', icon: Camera, tickers: ['ADBE', 'GOOGL', 'MSFT'] },
    { id: 'search-disruption', title: 'AI Search Disruption', summary: 'AI chatbots challenging traditional search.', category: 'Technology', icon: Globe, tickers: ['GOOGL', 'MSFT', 'META'] },
    { id: 'digital-twins', title: 'Digital Twin Technology', summary: 'Virtual replicas optimizing physical systems.', category: 'Technology', icon: Cpu, tickers: ['ANSS', 'AUTK', 'SIEMENS'] },
    
    // More healthcare themes
    { id: 'obesity-devices', title: 'Obesity Treatment Devices', summary: 'Medical devices complementing GLP-1s.', category: 'Healthcare', icon: Heart, tickers: ['ISRG', 'MDT', 'ABT'] },
    { id: 'genomics-testing', title: 'Genomic Testing Expansion', summary: 'Genetic testing becoming standard care.', category: 'Healthcare', icon: Dna, tickers: ['ILMN', 'EXAS', 'NTRA'] },
    { id: 'medtech-miniaturization', title: 'MedTech Miniaturization', summary: 'Smaller devices enabling new procedures.', category: 'Healthcare', icon: Microscope, tickers: ['ABT', 'BSX', 'SHOCKW'] },
    { id: 'oncology-immunotherapy', title: 'Next-Gen Immunotherapy', summary: 'Cancer immunotherapy advancing rapidly.', category: 'Healthcare', icon: Shield, tickers: ['MRK', 'BMY', 'RHHBY'] },
    { id: 'value-based-care', title: 'Value-Based Care Shift', summary: 'Healthcare payment models evolving.', category: 'Healthcare', icon: Heart, tickers: ['CVS', 'UNH', 'HUM'] },
    { id: 'clinical-ai', title: 'Clinical AI Decision Support', summary: 'AI assisting physicians in diagnosis.', category: 'Healthcare', icon: Brain, tickers: ['GOOGL', 'MSFT', 'IBM'] },
    { id: 'hospital-automation', title: 'Hospital Automation', summary: 'Healthcare facilities adopting automation.', category: 'Healthcare', icon: Factory, tickers: ['ABT', 'ISRG', 'TMO'] },
    
    // More macro themes
    { id: 'japan-reflation', title: 'Japan Reflation Trade', summary: 'Japanese economy escaping deflation.', category: 'Macro', icon: TrendingUp, tickers: ['EWJ', 'TM', 'SNE'] },
    { id: 'india-growth', title: 'India Growth Story', summary: 'India emerging as growth engine.', category: 'Macro', icon: Globe, tickers: ['INFY', 'IBN', 'INDA'] },
    { id: 'nearshoring-mexico', title: 'Mexico Nearshoring', summary: 'Manufacturing moving to Mexico.', category: 'Macro', icon: Factory, tickers: ['CEMEX', 'AMX', 'WALMEX'] },
    { id: 'dollar-dynamics', title: 'Dollar Strength Impact', summary: 'USD moves affecting global markets.', category: 'Macro', icon: Banknote, tickers: ['UUP', 'FXE', 'GLD'] },
    { id: 'commodity-supercycle', title: 'Commodity Supercycle', summary: 'Structural commodity demand shift.', category: 'Macro', icon: BarChart3, tickers: ['BHP', 'RIO', 'VALE'] },
    { id: 'emerging-markets-rebound', title: 'EM Rebound', summary: 'Emerging markets attracting flows.', category: 'Macro', icon: Globe, tickers: ['VWO', 'EEM', 'IEMG'] },
    { id: 'china-recovery', title: 'China Stimulus Trade', summary: 'Chinese policy stimulus efforts.', category: 'Macro', icon: Globe, tickers: ['BABA', 'JD', 'PDD'] },
    { id: 'european-recovery', title: 'European Earnings Recovery', summary: 'European corporates improving margins.', category: 'Macro', icon: Landmark, tickers: ['VGK', 'HEDJ', 'EZU'] },
    
    // More energy themes
    { id: 'lng-infrastructure', title: 'LNG Infrastructure Build', summary: 'Natural gas export capacity expanding.', category: 'Energy', icon: Factory, tickers: ['LNG', 'NEXT', 'TELL'] },
    { id: 'power-grid-upgrade', title: 'Power Grid Upgrade', summary: 'Grid investment for reliability.', category: 'Energy', icon: Zap, tickers: ['NEE', 'ETN', 'PWR'] },
    { id: 'solar-manufacturing', title: 'Solar Manufacturing Renaissance', summary: 'US solar panel production expanding.', category: 'Energy', icon: Sun, tickers: ['FSLR', 'SEDG', 'RUN'] },
    { id: 'energy-independence', title: 'Energy Independence Focus', summary: 'Nations prioritizing energy security.', category: 'Energy', icon: Shield, tickers: ['XOM', 'CVX', 'COP'] },
    { id: 'clean-tech-materials', title: 'Clean Tech Materials', summary: 'Critical materials for energy transition.', category: 'Energy', icon: Mountain, tickers: ['MP', 'LAC', 'ALB'] },
    
    // More consumer themes  
    { id: 'restaurant-tech', title: 'Restaurant Technology', summary: 'Dining experience going digital.', category: 'Consumer', icon: Coffee, tickers: ['SBUX', 'CMG', 'DPZ'] },
    { id: 'beauty-tech', title: 'Beauty Tech Innovation', summary: 'Technology transforming beauty industry.', category: 'Consumer', icon: Sparkles, tickers: ['EL', 'ULTA', 'COTY'] },
    { id: 'resale-economy', title: 'Resale & Recommerce', summary: 'Secondhand market going mainstream.', category: 'Consumer', icon: ShoppingCart, tickers: ['EBAY', 'POSH', 'REAL'] },
    { id: 'personalization-at-scale', title: 'Personalization at Scale', summary: 'AI enabling mass customization.', category: 'Consumer', icon: Users, tickers: ['AMZN', 'NFLX', 'SHOP'] },
    { id: 'wellness-supplements', title: 'Wellness Supplements', summary: 'Preventive health driving supplement growth.', category: 'Consumer', icon: Pill, tickers: ['HAIN', 'VITL', 'BYND'] },
    { id: 'outdoor-recreation', title: 'Outdoor Recreation Boom', summary: 'Outdoor activity participation elevated.', category: 'Consumer', icon: TreePine, tickers: ['YETI', 'VFC', 'PII'] },
    { id: 'sustainable-fashion', title: 'Sustainable Fashion', summary: 'Circular fashion gaining momentum.', category: 'Consumer', icon: Leaf, tickers: ['LULU', 'NKE', 'VFC'] },
    
    // More industrial themes
    { id: 'clean-industrial', title: 'Clean Industrial Processes', summary: 'Manufacturing decarbonization advancing.', category: 'Industrials', icon: Factory, tickers: ['LIN', 'APD', 'CAT'] },
    { id: 'automation-shortage', title: 'Automation vs Labor Shortage', summary: 'Automation addressing worker scarcity.', category: 'Industrials', icon: Cpu, tickers: ['ROK', 'ABB', 'HON'] },
    { id: 'supply-chain-visibility', title: 'Supply Chain Visibility', summary: 'Real-time supply chain tracking.', category: 'Industrials', icon: Eye, tickers: ['FDX', 'UPS', 'CHRW'] },
    { id: 'smart-buildings', title: 'Smart Building Tech', summary: 'Buildings becoming intelligent.', category: 'Industrials', icon: Building2, tickers: ['JCI', 'HON', 'SIE'] },
    { id: 'industrial-iot', title: 'Industrial IoT Scale', summary: 'Connected machinery transforming operations.', category: 'Industrials', icon: Wifi, tickers: ['ROK', 'EMR', 'ABB'] },
    
    // Additional diverse themes
    { id: 'esports-gaming', title: 'Esports Professionalization', summary: 'Competitive gaming attracting mainstream investment.', category: 'Consumer', icon: Gamepad2, tickers: ['EA', 'ATVI', 'TTWO'] },
    { id: 'ocean-economy', title: 'Blue Economy Growth', summary: 'Sustainable ocean industries emerging.', category: 'Commodities', icon: Fish, tickers: ['MOWI', 'SJT', 'AQST'] },
    { id: 'protein-diversification', title: 'Protein Diversification', summary: 'Alternative proteins gaining shelf space.', category: 'Consumer', icon: Beef, tickers: ['TSN', 'HRL', 'CAG'] },
    { id: 'telehealth-mental', title: 'Mental Telehealth', summary: 'Remote mental health services scaling.', category: 'Healthcare', icon: Brain, tickers: ['TDOC', 'TALK', 'AMWL'] },
    { id: 'smart-agriculture', title: 'Smart Agriculture', summary: 'AI and IoT transforming farming.', category: 'Commodities', icon: Wheat, tickers: ['DE', 'AGCO', 'CNHI'] },
    { id: 'carbon-markets', title: 'Carbon Markets Development', summary: 'Carbon credit trading infrastructure.', category: 'Energy', icon: Leaf, tickers: ['ICE', 'CME', 'KRBN'] },
    { id: 'education-tech', title: 'EdTech Enterprise', summary: 'Corporate learning platforms growing.', category: 'Consumer', icon: GraduationCap, tickers: ['CHGG', 'COUR', 'LSCC'] },
    { id: 'news-media-evolution', title: 'Digital Media Evolution', summary: 'Media business models transforming.', category: 'Consumer', icon: Newspaper, tickers: ['NYT', 'WMG', 'DIS'] },
    { id: 'audio-streaming', title: 'Audio Streaming Growth', summary: 'Podcasts and music streaming expanding.', category: 'Consumer', icon: Music, tickers: ['SPOT', 'AAPL', 'GOOGL'] },
    { id: 'home-improvement', title: 'Home Improvement Cycle', summary: 'Renovation spending remaining elevated.', category: 'Consumer', icon: Home, tickers: ['HD', 'LOW', 'WSM'] },
    
    // Even more themes to reach 300+
    { id: 'space-tourism', title: 'Space Tourism Launch', summary: 'Commercial space tourism beginning.', category: 'Industrials', icon: Plane, tickers: ['SPCE', 'RKLB', 'BA'] },
    { id: 'aging-infrastructure', title: 'Aging Infrastructure Replacement', summary: 'Decades of underinvestment being addressed.', category: 'Industrials', icon: Building2, tickers: ['VMC', 'MLM', 'CAT'] },
    { id: 'uranium-demand', title: 'Uranium Supply Squeeze', summary: 'Nuclear renaissance driving uranium demand.', category: 'Commodities', icon: Atom, tickers: ['CCJ', 'UEC', 'UUUU'] },
    { id: 'rare-earths', title: 'Rare Earths Security', summary: 'Critical minerals supply diversification.', category: 'Commodities', icon: Mountain, tickers: ['MP', 'LYSCF', 'UUUU'] },
    { id: 'fertilizer-food-security', title: 'Food Security Focus', summary: 'Agricultural inputs for food production.', category: 'Commodities', icon: Wheat, tickers: ['NTR', 'MOS', 'CF'] },
    { id: 'silver-industrial', title: 'Silver Industrial Demand', summary: 'Solar and electronics driving silver use.', category: 'Commodities', icon: Coins, tickers: ['SLV', 'PAAS', 'WPM'] },
    { id: 'steel-decarbonization', title: 'Green Steel Transition', summary: 'Steel industry reducing carbon footprint.', category: 'Industrials', icon: Factory, tickers: ['NUE', 'X', 'CLF'] },
    { id: 'cement-low-carbon', title: 'Low-Carbon Cement', summary: 'Construction materials decarbonizing.', category: 'Industrials', icon: Building2, tickers: ['VMC', 'MLM', 'SUMMIT'] },
    { id: 'timber-carbon', title: 'Timber Carbon Credits', summary: 'Forests as carbon capture assets.', category: 'Commodities', icon: TreePine, tickers: ['WY', 'RYN', 'PCH'] },
  ];

  for (const template of themeTemplates) {
    const tickers = template.tickers.map(symbol => ({
      symbol,
      name: `${symbol} Corporation`,
      change: Math.round((Math.random() * 10 - 3) * 10) / 10,
      sentiment: (Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish') as 'bullish' | 'bearish' | 'neutral',
      themeRelevance: `Key player in the ${template.title.toLowerCase()} trend.`,
    }));

    additionalThemes.push({
      id: template.id,
      title: template.title,
      summary: template.summary,
      detailedSummary: `${template.summary} This theme represents a significant market narrative with multiple catalysts driving investor interest. Companies within this space are seeing increased attention as the trend gains momentum. The opportunity spans both established players and emerging challengers.`,
      impactPercent: Math.round((Math.random() * 18 - 4) * 10) / 10,
      sentimentScore: Math.round((Math.random() * 0.45 + 0.45) * 100) / 100,
      icon: template.icon,
      category: template.category,
      tickers,
      headlines: [
        { title: `${template.title} gains momentum amid market shifts`, source: 'Bloomberg', time: `${Math.floor(Math.random() * 8) + 1}h ago` },
        { title: `Analysts upgrade outlook for ${template.title.toLowerCase()} sector`, source: 'Reuters', time: `${Math.floor(Math.random() * 12) + 1}h ago` },
      ],
    });
  }

  return additionalThemes;
}

// Function to get randomized themes for display
export function getRandomizedThemes(count: number = 12): MarketTheme[] {
  // Use a seed based on the current date to get consistent themes for the day
  // but different each new day
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  
  // Create a shuffled copy using Fisher-Yates with seeded random
  const shuffled = [...MARKET_THEMES];
  let currentIndex = shuffled.length;
  let randomIndex;
  
  // Simple seeded random function
  const seededRandom = (function() {
    let s = seed;
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  })();
  
  while (currentIndex !== 0) {
    randomIndex = Math.floor(seededRandom() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
  }
  
  return shuffled.slice(0, count);
}

// For truly random each visit (not date-based)
export function getTrulyRandomThemes(count: number = 12): MarketTheme[] {
  const shuffled = [...MARKET_THEMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
