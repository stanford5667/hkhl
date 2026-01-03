// Investment Goal Types
export interface InvestmentGoal {
  id: string;
  name: string; // e.g., "Retirement", "House Down Payment", "Emergency Fund"
  targetAmount: number;
  targetDate: Date;
  priority: 'critical' | 'important' | 'nice-to-have';
  flexibility: 'fixed' | 'somewhat-flexible' | 'very-flexible';
}

// Risk Profile Types
export interface PreviousLossReaction {
  experienced: boolean;
  reaction: string;
}

export interface RiskProfile {
  emotionalTolerance: number; // 0-100, how they feel about losses
  financialCapacity: number; // 0-100, how much they CAN lose
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  previousLosses: PreviousLossReaction;
  incomeStability: 'stable' | 'variable' | 'uncertain';
}

// Liquidity Needs Types
export interface UpcomingExpense {
  amount: number;
  timeframe: string;
  description: string;
}

export interface LiquidityNeeds {
  emergencyFundMonths: number;
  upcomingExpenses: UpcomingExpense[];
  incomeReliability: 'very-reliable' | 'somewhat-reliable' | 'unpredictable';
}

// Investment Constraints Types
export interface ConcentrationLimits {
  maxSinglePosition: number; // percentage
  maxSectorExposure: number; // percentage
}

export interface TaxConsiderations {
  bracket: string;
  harvestingInterest: boolean;
  accountTypes: string[]; // e.g., ["401k", "Roth IRA", "Taxable"]
}

export interface InvestmentConstraints {
  ethicalExclusions: string[]; // e.g., "tobacco", "weapons", "fossil-fuels"
  concentrationLimits: ConcentrationLimits;
  taxConsiderations: TaxConsiderations;
}

// Rebalancing Rules
export interface RebalancingRules {
  frequency: string; // e.g., "quarterly", "annually", "threshold-based"
  threshold: number; // percentage drift that triggers rebalancing
}

// Complete Investor Policy Statement
export interface InvestorPolicyStatement {
  id: string;
  goals: InvestmentGoal[];
  riskProfile: RiskProfile;
  liquidityNeeds: LiquidityNeeds;
  constraints: InvestmentConstraints;
  createdAt: Date;
  lastReviewed: Date;
  rebalancingRules: RebalancingRules;
  investmentPhilosophy: string; // free text summary
}

// Questionnaire Types
export type QuestionCategory = 'goals' | 'risk' | 'liquidity' | 'constraints' | 'knowledge';
export type QuestionInputType = 'slider' | 'select' | 'multi-select' | 'number' | 'text' | 'scenario';

export interface QuestionOption {
  value: string;
  label: string;
  description: string;
}

export interface QuestionnaireQuestion {
  id: string;
  category: QuestionCategory;
  question: string;
  explanation: string; // plain-language why this matters
  technicalTerm?: string;
  technicalDefinition?: string;
  impactDescription: string; // how answer affects portfolio
  inputType: QuestionInputType;
  options?: QuestionOption[];
  followUpQuestions?: string[]; // ids of dependent questions
}

// Helper types for questionnaire responses
export interface QuestionnaireResponse {
  questionId: string;
  value: string | number | string[];
  answeredAt: Date;
}

export interface QuestionnaireSession {
  id: string;
  responses: QuestionnaireResponse[];
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
}

// Derived recommendation types
export interface PortfolioRecommendation {
  suggestedAllocation: Record<string, number>; // asset class -> percentage
  riskScore: number; // 0-100
  timeHorizon: string;
  reasoning: string[];
}
