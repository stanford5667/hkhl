import { QuestionnaireQuestion, QuestionCategory } from '@/types/investorPolicy';

export interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  questions: QuestionnaireQuestion[];
}

// ============================================
// SECTION 1: GOALS & PURPOSE (3 essential questions)
// ============================================
const goalsQuestions: QuestionnaireQuestion[] = [
  {
    id: 'goal-purpose',
    category: 'goals',
    question: 'What is the primary purpose of this investment?',
    explanation: 'Your investment goal determines everything from how much risk to take to which types of assets to hold.',
    impactDescription: 'This directly sets your time horizon and risk capacity.',
    inputType: 'select',
    options: [
      {
        value: 'retirement',
        label: 'Retirement',
        description: 'Building wealth for when you stop working. Typically 10-40 years away.'
      },
      {
        value: 'house-purchase',
        label: 'House Down Payment',
        description: 'Saving for a specific large purchase. Usually 2-7 years away.'
      },
      {
        value: 'wealth-building',
        label: 'General Wealth Building',
        description: 'Growing your money without a specific goal.'
      },
      {
        value: 'financial-independence',
        label: 'Financial Independence / Early Retirement',
        description: 'Building enough wealth to make work optional.'
      }
    ]
  },
  {
    id: 'goal-timeline',
    category: 'goals',
    question: 'When do you need to access this money?',
    explanation: 'Time is your greatest asset in investing. The longer your timeline, the more you can benefit from compound growth.',
    technicalTerm: 'Time Horizon',
    technicalDefinition: 'The expected number of years you plan to hold an investment before needing the money.',
    impactDescription: 'Short timelines require conservative allocations. Long timelines enable aggressive growth strategies.',
    inputType: 'select',
    options: [
      {
        value: 'less-than-3',
        label: 'Less than 3 years',
        description: 'Short-term. Limited equity exposure recommended.'
      },
      {
        value: '3-7-years',
        label: '3-7 years',
        description: 'Medium-term. Balanced approach between growth and stability.'
      },
      {
        value: '7-15-years',
        label: '7-15 years',
        description: 'Long-term. Can weather significant downturns.'
      },
      {
        value: 'more-than-15',
        label: 'More than 15 years',
        description: 'Very long-term. Maximum growth potential.'
      }
    ]
  },
  {
    id: 'goal-priority',
    category: 'goals',
    question: 'How critical is achieving this specific goal?',
    explanation: 'Some goals are "must achieve" while others are aspirational. This affects how we balance risk and reward.',
    impactDescription: 'Critical goals require more conservative approaches. Aspirational goals can tolerate more risk.',
    inputType: 'select',
    options: [
      {
        value: 'critical',
        label: 'Critical - I absolutely need to achieve this',
        description: 'We\'ll prioritize certainty over maximum returns.'
      },
      {
        value: 'important',
        label: 'Important - I\'d be disappointed to miss it',
        description: 'We\'ll balance probability of success with growth potential.'
      },
      {
        value: 'nice-to-have',
        label: 'Nice to have - I\'m okay with uncertainty',
        description: 'We can take more risk for potentially higher rewards.'
      }
    ]
  }
];

// ============================================
// SECTION 2: RISK UNDERSTANDING (4 essential questions)
// ============================================
const riskQuestions: QuestionnaireQuestion[] = [
  {
    id: 'risk-scenario-drop',
    category: 'risk',
    question: 'Scenario: Your $100,000 portfolio drops to $80,000 in one month. What would you do?',
    explanation: 'How you behave during market drops matters more than your stated risk tolerance. Be honest with yourself.',
    technicalTerm: 'Behavioral Risk Tolerance',
    technicalDefinition: 'How you actually react to losses, as opposed to how you think you\'d react.',
    impactDescription: 'If you\'d sell during a drop, we need a more conservative portfolio.',
    inputType: 'scenario',
    options: [
      {
        value: 'sell-all',
        label: 'Sell everything to stop the bleeding',
        description: 'This means a very conservative portfolio is right for you.'
      },
      {
        value: 'sell-some',
        label: 'Sell some to reduce exposure',
        description: 'Suggests a moderate portfolio to minimize these situations.'
      },
      {
        value: 'hold',
        label: 'Do nothing and wait it out',
        description: 'Good discipline. Be honest - is this really how you\'d feel?'
      },
      {
        value: 'buy-more',
        label: 'Buy more at the lower prices',
        description: 'If this is genuinely you, you can handle an aggressive portfolio.'
      }
    ]
  },
  {
    id: 'risk-max-loss',
    category: 'risk',
    question: 'What\'s the maximum percentage loss you could tolerate in a year?',
    explanation: 'This isn\'t about what\'s "reasonable" - it\'s about what you can actually live with without losing sleep.',
    technicalTerm: 'Maximum Drawdown Tolerance',
    technicalDefinition: 'The largest decline you can emotionally and financially withstand without making poor decisions.',
    impactDescription: 'This directly limits how aggressive your portfolio can be.',
    inputType: 'slider',
    options: [
      { value: '10', label: '10%', description: 'Conservative - prioritize stability' },
      { value: '20', label: '20%', description: 'Moderate - balanced approach' },
      { value: '30', label: '30%', description: 'Aggressive - accept significant volatility' },
      { value: '40', label: '40%+', description: 'Very aggressive - long-term growth focus' }
    ]
  },
  {
    id: 'risk-knowledge-level',
    category: 'risk',
    question: 'How would you rate your investment knowledge?',
    explanation: 'There\'s no judgment here. Knowing what you don\'t know is actually wisdom.',
    impactDescription: 'Your experience level affects both strategy complexity and volatility tolerance.',
    inputType: 'select',
    options: [
      {
        value: 'beginner',
        label: 'Beginner - I know the basics',
        description: 'We\'ll keep it simple and educational.'
      },
      {
        value: 'intermediate',
        label: 'Intermediate - I understand stocks, bonds, and diversification',
        description: 'Good foundation. We can explore more strategies.'
      },
      {
        value: 'advanced',
        label: 'Advanced - I\'m comfortable with complex concepts',
        description: 'We can discuss advanced strategies and optimizations.'
      }
    ]
  },
  {
    id: 'risk-regret',
    category: 'risk',
    question: 'Which would you regret more?',
    explanation: 'This reveals your true risk personality. Neither answer is wrong.',
    impactDescription: 'This helps calibrate between conservative and aggressive strategies.',
    inputType: 'select',
    options: [
      {
        value: 'missing-gains',
        label: 'Missing out on gains because I was too conservative',
        description: 'You have a growth mindset. We can lean more aggressive.'
      },
      {
        value: 'losing-money',
        label: 'Losing money because I was too aggressive',
        description: 'You prioritize preservation. We\'ll be more conservative.'
      },
      {
        value: 'equal',
        label: 'I\'d regret both equally',
        description: 'A balanced approach is probably right for you.'
      }
    ]
  }
];

// ============================================
// SECTION 3: FINANCIAL SITUATION (2 essential questions)
// ============================================
const liquidityQuestions: QuestionnaireQuestion[] = [
  {
    id: 'liquidity-income-stability',
    category: 'liquidity',
    question: 'How stable is your primary income source?',
    explanation: 'Stable income lets you take more investment risk because you can afford to wait out downturns.',
    impactDescription: 'Stable income allows for more aggressive investing. Variable income requires more conservative approaches.',
    inputType: 'select',
    options: [
      {
        value: 'very-stable',
        label: 'Very stable - secure job, consistent salary',
        description: 'Great foundation for investing. You can handle more volatility.'
      },
      {
        value: 'mostly-stable',
        label: 'Mostly stable - employed but some uncertainty',
        description: 'Good position. Maintain some extra liquidity as a buffer.'
      },
      {
        value: 'variable',
        label: 'Variable - commission, freelance, or seasonal work',
        description: 'We\'ll build in more flexibility and avoid illiquid investments.'
      },
      {
        value: 'uncertain',
        label: 'Uncertain - unstable situation',
        description: 'We\'ll be more conservative and ensure ample emergency reserves.'
      }
    ]
  },
  {
    id: 'liquidity-emergency-fund',
    category: 'liquidity',
    question: 'How many months of expenses do you have in emergency savings?',
    explanation: 'Your emergency fund is the foundation of financial security. Without it, you might be forced to sell investments at the worst time.',
    technicalTerm: 'Emergency Fund',
    technicalDefinition: 'Liquid savings that can cover 3-6 months of essential expenses, kept separate from investments.',
    impactDescription: 'If you lack emergency savings, we should prioritize building that before aggressive investing.',
    inputType: 'select',
    options: [
      {
        value: 'less-than-3',
        label: 'Less than 3 months',
        description: 'Consider building emergency fund alongside conservative investing.'
      },
      {
        value: '3-6-months',
        label: '3-6 months',
        description: 'Solid foundation. You\'re ready to invest with confidence.'
      },
      {
        value: 'more-than-6',
        label: 'More than 6 months',
        description: 'Excellent cushion. You can afford to take more investment risk.'
      }
    ]
  }
];

// ============================================
// SECTION 4: INVESTMENT PREFERENCES (4 essential questions)
// ============================================
const constraintsQuestions: QuestionnaireQuestion[] = [
  {
    id: 'constraints-ethical',
    category: 'constraints',
    question: 'Are there any industries you want to avoid for ethical reasons?',
    explanation: 'Your investments should align with your values. There\'s no right answer here.',
    technicalTerm: 'ESG Investing',
    technicalDefinition: 'Environmental, Social, and Governance investing considers factors beyond just financial returns.',
    impactDescription: 'Excluding industries reduces diversification slightly but allows your portfolio to reflect your values.',
    inputType: 'multi-select',
    options: [
      {
        value: 'none',
        label: 'No restrictions - I prioritize returns',
        description: 'Maximum investment flexibility.'
      },
      {
        value: 'tobacco',
        label: 'Tobacco and nicotine',
        description: 'Excludes cigarette manufacturers and vaping companies.'
      },
      {
        value: 'weapons',
        label: 'Weapons and defense',
        description: 'Excludes defense contractors and firearm manufacturers.'
      },
      {
        value: 'fossil-fuels',
        label: 'Fossil fuels',
        description: 'Excludes oil, gas, and coal companies.'
      },
      {
        value: 'gambling',
        label: 'Gambling',
        description: 'Excludes casinos and sports betting companies.'
      }
    ]
  },
  {
    id: 'constraints-international',
    category: 'constraints',
    question: 'How do you feel about international investments?',
    explanation: 'International diversification can reduce risk because different economies don\'t always move together.',
    technicalTerm: 'Global Diversification',
    technicalDefinition: 'Spreading investments across multiple countries to reduce single-economy risk.',
    impactDescription: 'International exposure can improve risk-adjusted returns but adds complexity.',
    inputType: 'select',
    options: [
      {
        value: 'us-only',
        label: 'US investments only',
        description: 'Simpler but less diversified. US is about 60% of global market.'
      },
      {
        value: 'mostly-us',
        label: 'Mostly US with some international',
        description: 'Good balance of familiarity with diversification benefits.'
      },
      {
        value: 'balanced',
        label: 'Balanced global exposure',
        description: 'Most diversified approach matching actual market sizes.'
      }
    ]
  },
  {
    id: 'constraints-volatility-preference',
    category: 'constraints',
    question: 'Which would you prefer: steady small gains or volatile higher potential gains?',
    explanation: 'There\'s a fundamental trade-off: higher expected returns come with higher volatility.',
    impactDescription: 'Your preference shapes the core of your portfolio allocation.',
    inputType: 'select',
    options: [
      {
        value: 'steady',
        label: '6% average with rarely more than 10% swings',
        description: 'Focus on stability. More bonds and dividend payers.'
      },
      {
        value: 'moderate',
        label: '8% average with occasional 20% swings',
        description: 'Balanced approach.'
      },
      {
        value: 'growth',
        label: '10% average with potential 30%+ swings',
        description: 'Growth-focused. More stocks and aggressive sectors.'
      }
    ]
  },
  {
    id: 'constraints-crypto',
    category: 'constraints',
    question: 'How do you feel about cryptocurrency?',
    explanation: 'Cryptocurrency is highly volatile but some view it as a hedge or growth opportunity.',
    technicalTerm: 'Digital Assets',
    technicalDefinition: 'Cryptocurrencies like Bitcoin can gain or lose 50%+ in months.',
    impactDescription: 'Your comfort with crypto affects whether we include any digital asset exposure.',
    inputType: 'select',
    options: [
      {
        value: 'no-crypto',
        label: 'No cryptocurrency',
        description: 'Focus on traditional assets only.'
      },
      {
        value: 'small-allocation',
        label: 'Small allocation (1-5%)',
        description: 'Small enough to not hurt if it crashes, enough to benefit if it grows.'
      },
      {
        value: 'moderate-allocation',
        label: 'Moderate allocation (5-10%)',
        description: 'Meaningful exposure. Adds volatility and potential upside.'
      }
    ]
  }
];

// ============================================
// SECTION 5: KNOWLEDGE CHECK (2 essential questions)
// ============================================
const knowledgeQuestions: QuestionnaireQuestion[] = [
  {
    id: 'knowledge-diversification',
    category: 'knowledge',
    question: 'Why might a diversified portfolio underperform a single hot stock?',
    explanation: 'This explores your understanding of diversification\'s purpose and tradeoffs.',
    impactDescription: 'Understanding this prevents frustration when your portfolio trails a hot stock.',
    inputType: 'select',
    options: [
      {
        value: 'correct',
        label: 'Diversification includes average performers, diluting the winners',
        description: '✓ Correct! Diversification avoids disasters, not catches every rocket ship.'
      },
      {
        value: 'incorrect-worse',
        label: 'Diversification makes returns worse overall',
        description: 'Not quite. It improves risk-adjusted returns by avoiding catastrophic downside.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'A diversified portfolio includes average performers along with winners. That\'s the cost of protection.'
      }
    ]
  },
  {
    id: 'knowledge-rebalancing',
    category: 'knowledge',
    question: 'What is the purpose of portfolio rebalancing?',
    explanation: 'Rebalancing is a key concept that many investors don\'t fully understand.',
    impactDescription: 'Understanding rebalancing helps you follow through on strategy.',
    inputType: 'select',
    options: [
      {
        value: 'correct',
        label: 'To maintain your target allocation and risk level',
        description: '✓ Correct! Rebalancing keeps your portfolio aligned with your goals.'
      },
      {
        value: 'timing',
        label: 'To time the market and buy low, sell high',
        description: 'Side effect, but main purpose is risk management.'
      },
      {
        value: 'unsure',
        label: 'I\'m not sure',
        description: 'Rebalancing returns you to your target allocation when market movements cause drift.'
      }
    ]
  }
];

// ============================================
// EXPORT ALL SECTIONS
// ============================================
export const QUESTIONNAIRE_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'goals',
    title: 'Goals & Purpose',
    description: 'Understanding what you\'re investing for is the foundation of any good investment plan.',
    icon: 'Target',
    questions: goalsQuestions
  },
  {
    id: 'risk',
    title: 'Risk Understanding',
    description: 'Let\'s explore your true relationship with risk - not what you think it should be, but what it actually is.',
    icon: 'Activity',
    questions: riskQuestions
  },
  {
    id: 'liquidity',
    title: 'Financial Situation',
    description: 'Your current financial situation affects how much risk is appropriate for you.',
    icon: 'Wallet',
    questions: liquidityQuestions
  },
  {
    id: 'constraints',
    title: 'Investment Preferences',
    description: 'Everyone has different preferences and constraints. Let\'s capture yours.',
    icon: 'Settings',
    questions: constraintsQuestions
  },
  {
    id: 'knowledge',
    title: 'Knowledge Check',
    description: 'A few quick questions to understand your investment knowledge. No wrong answers!',
    icon: 'GraduationCap',
    questions: knowledgeQuestions
  }
];

// Helper functions
export const getAllQuestions = (): QuestionnaireQuestion[] => {
  return QUESTIONNAIRE_SECTIONS.flatMap(section => section.questions);
};

export const getQuestionById = (id: string): QuestionnaireQuestion | undefined => {
  return getAllQuestions().find(q => q.id === id);
};

export const getSectionById = (id: string): QuestionnaireSection | undefined => {
  return QUESTIONNAIRE_SECTIONS.find(s => s.id === id);
};
