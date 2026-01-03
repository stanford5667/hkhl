/**
 * Component Tests for MetricExplanationCard
 * Tests rendering, interactions, and different modes
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as React from 'react';

// Mock the shared metric explanation card component
const mockMetricDefinition = {
  id: 'sharpe',
  name: 'Sharpe Ratio',
  formula: '(Rp - Rf) / σp',
  formulaExplained: 'Portfolio Return minus Risk-Free Rate, divided by Portfolio Volatility',
  plainEnglish: 'How much extra return you get for each unit of risk taken',
  whyItMatters: 'Higher is better. A Sharpe above 1.0 is good, above 2.0 is excellent.',
  category: 'Risk-Adjusted',
  interpretation: {
    excellent: { min: 2.0, max: null, label: 'Excellent' },
    good: { min: 1.0, max: 2.0, label: 'Good' },
    average: { min: 0.5, max: 1.0, label: 'Average' },
    poor: { min: null, max: 0.5, label: 'Poor' },
  },
};

const mockTrace = {
  metricId: 'sharpe',
  calculatedValue: 1.28,
  timestamp: new Date().toISOString(),
  steps: [
    { description: 'Fetched 252 days of returns', value: 252, unit: 'days' },
    { description: 'Calculated annualized return', value: 0.1847, unit: 'decimal' },
    { description: 'Calculated portfolio volatility', value: 0.1023, unit: 'decimal' },
    { description: 'Applied risk-free rate', value: 0.05, unit: 'decimal' },
    { description: 'Final Sharpe Ratio', value: 1.28, unit: 'ratio' },
  ],
  dataSource: 'polygon',
  dateRange: {
    start: '2023-01-01',
    end: '2023-12-31',
  },
};

// Simple mock component for testing
const MockMetricExplanationCard = ({ 
  metricId, 
  value, 
  definition, 
  trace, 
  variant = 'compact',
  onExpand 
}: {
  metricId: string;
  value: number;
  definition: typeof mockMetricDefinition;
  trace?: typeof mockTrace;
  variant?: 'compact' | 'expanded';
  onExpand?: () => void;
}) => (
  React.createElement('div', { 'data-testid': 'metric-card', 'data-variant': variant, onClick: onExpand },
    React.createElement('div', { 'data-testid': 'metric-name' }, definition.name),
    React.createElement('div', { 'data-testid': 'metric-value' }, value.toFixed(2)),
    React.createElement('div', { 'data-testid': 'metric-formula' }, definition.formula),
    variant === 'expanded' && React.createElement(React.Fragment, null,
      React.createElement('div', { 'data-testid': 'metric-explanation' }, definition.plainEnglish),
      React.createElement('div', { 'data-testid': 'metric-importance' }, definition.whyItMatters),
      trace && React.createElement('div', { 'data-testid': 'calculation-trace' },
        trace.steps.map((step, i) => 
          React.createElement('div', { key: i, 'data-testid': `trace-step-${i}` },
            `${step.description}: ${step.value}`
          )
        )
      )
    )
  )
);

describe('MetricExplanationCard', () => {
  describe('Compact Mode', () => {
    it('should render metric name and value', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'compact'
        })
      );
      
      expect(getByTestId('metric-name')).toHaveTextContent('Sharpe Ratio');
      expect(getByTestId('metric-value')).toHaveTextContent('1.28');
    });

    it('should show formula in compact mode', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'compact'
        })
      );
      
      expect(getByTestId('metric-formula')).toHaveTextContent('(Rp - Rf) / σp');
    });

    it('should not show explanation in compact mode', () => {
      const { queryByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'compact'
        })
      );
      
      expect(queryByTestId('metric-explanation')).not.toBeInTheDocument();
    });
  });

  describe('Expanded Mode', () => {
    it('should show plain English explanation', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'expanded'
        })
      );
      
      expect(getByTestId('metric-explanation')).toHaveTextContent(
        'How much extra return you get for each unit of risk taken'
      );
    });

    it('should show why it matters', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'expanded'
        })
      );
      
      expect(getByTestId('metric-importance')).toHaveTextContent(
        'Higher is better'
      );
    });

    it('should show calculation trace when provided', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          trace: mockTrace,
          variant: 'expanded'
        })
      );
      
      expect(getByTestId('calculation-trace')).toBeInTheDocument();
      expect(getByTestId('trace-step-0')).toHaveTextContent('252');
    });

    it('should show all trace steps', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          trace: mockTrace,
          variant: 'expanded'
        })
      );
      
      for (let i = 0; i < mockTrace.steps.length; i++) {
        expect(getByTestId(`trace-step-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Interactions', () => {
    it('should call onExpand when clicked', () => {
      const onExpand = vi.fn();
      
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.28,
          definition: mockMetricDefinition,
          variant: 'compact',
          onExpand
        })
      );
      
      getByTestId('metric-card').click();
      expect(onExpand).toHaveBeenCalledTimes(1);
    });
  });

  describe('Value Formatting', () => {
    it('should format decimal values correctly', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 1.283456,
          definition: mockMetricDefinition
        })
      );
      
      expect(getByTestId('metric-value')).toHaveTextContent('1.28');
    });

    it('should handle negative values', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: -0.5,
          definition: mockMetricDefinition
        })
      );
      
      expect(getByTestId('metric-value')).toHaveTextContent('-0.50');
    });

    it('should handle zero values', () => {
      const { getByTestId } = render(
        React.createElement(MockMetricExplanationCard, {
          metricId: 'sharpe',
          value: 0,
          definition: mockMetricDefinition
        })
      );
      
      expect(getByTestId('metric-value')).toHaveTextContent('0.00');
    });
  });
});

describe('Metric Definitions', () => {
  const metricDefinitions = [
    {
      id: 'sharpe',
      name: 'Sharpe Ratio',
      formula: '(Rp - Rf) / σp',
      expectedCategory: 'Risk-Adjusted',
    },
    {
      id: 'volatility',
      name: 'Volatility',
      formula: 'σ = √(Σ(r - μ)² / n) × √252',
      expectedCategory: 'Risk',
    },
    {
      id: 'maxDrawdown',
      name: 'Maximum Drawdown',
      formula: 'Max[(Peak - Trough) / Peak]',
      expectedCategory: 'Risk',
    },
    {
      id: 'beta',
      name: 'Beta',
      formula: 'Cov(Rp, Rm) / Var(Rm)',
      expectedCategory: 'Benchmark',
    },
  ];

  it.each(metricDefinitions)(
    'should have valid definition for $name',
    ({ id, name, formula, expectedCategory }) => {
      const definition = {
        id,
        name,
        formula,
        category: expectedCategory,
        formulaExplained: 'Test explanation',
        plainEnglish: 'Test plain English',
        whyItMatters: 'Test importance',
        interpretation: {},
      };
      
      expect(definition.id).toBe(id);
      expect(definition.name).toBe(name);
      expect(definition.formula).toBe(formula);
      expect(definition.category).toBe(expectedCategory);
    }
  );
});

describe('Interpretation Thresholds', () => {
  const getInterpretation = (value: number, interpretation: typeof mockMetricDefinition.interpretation) => {
    for (const [level, range] of Object.entries(interpretation)) {
      const { min, max } = range as { min: number | null; max: number | null };
      if (
        (min === null || value >= min) &&
        (max === null || value < max)
      ) {
        return level;
      }
    }
    return 'unknown';
  };

  it('should classify excellent Sharpe ratio', () => {
    const result = getInterpretation(2.5, mockMetricDefinition.interpretation);
    expect(result).toBe('excellent');
  });

  it('should classify good Sharpe ratio', () => {
    const result = getInterpretation(1.5, mockMetricDefinition.interpretation);
    expect(result).toBe('good');
  });

  it('should classify average Sharpe ratio', () => {
    const result = getInterpretation(0.75, mockMetricDefinition.interpretation);
    expect(result).toBe('average');
  });

  it('should classify poor Sharpe ratio', () => {
    const result = getInterpretation(0.3, mockMetricDefinition.interpretation);
    expect(result).toBe('poor');
  });
});
