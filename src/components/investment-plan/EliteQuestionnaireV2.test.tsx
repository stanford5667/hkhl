import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as React from 'react';

import { EliteQuestionnaireV2 } from '@/components/investment-plan/EliteQuestionnaireV2';

// Mock toast hook used in the questionnaire
vi.mock('@/hooks/use-toast', () => {
  return {
    useToast: () => ({ toast: vi.fn() }),
  };
});

type MockAuthState = {
  user: any;
  isAuthenticated: boolean;
};

let mockAuthState: MockAuthState = { user: null, isAuthenticated: false };

vi.mock('@/contexts/AuthContext', () => {
  return {
    useAuth: () => mockAuthState,
  };
});

const click = (el: Element) => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const changeValue = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

function answerCurrentQuestion(queries: ReturnType<typeof render>) {
  // Currency question
  const currencyInputs = queries.queryAllByTestId(/currency-input-/) as HTMLInputElement[];
  if (currencyInputs.length) {
    changeValue(currencyInputs[0], '1000');
    return;
  }

  // Select/scenario question
  const optionButtons = queries.queryAllByTestId(/question-option-/);
  if (optionButtons.length) {
    click(optionButtons[0]);
    return;
  }

  throw new Error('No recognizable input for current question');
}

async function runToLastQuestion(queries: ReturnType<typeof render>) {
  // Defensive cap to avoid infinite loops if UI changes
  for (let i = 0; i < 60; i++) {
    const next = queries.getByTestId('strategy-next');
    const isGenerate = (next.textContent || '').includes('Generate My Plan');
    if (isGenerate) return;

    answerCurrentQuestion(queries);
    click(next);
  }
  throw new Error('Failed to reach last question within step cap');
}

describe('EliteQuestionnaireV2', () => {
  beforeEach(() => {
    mockAuthState = { user: null, isAuthenticated: false };
  });

  it('prompts auth on Generate My Plan when user is not authenticated', async () => {
    const onComplete = vi.fn();

    const queries = render(<EliteQuestionnaireV2 onComplete={onComplete} />);

    await runToLastQuestion(queries);

    // Answer last question and click generate
    answerCurrentQuestion(queries);
    click(queries.getByTestId('strategy-next'));

    expect(
      await queries.findByText('Create an account to generate your strategy')
    ).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('calls onComplete when authenticated and Generate My Plan is pressed', async () => {
    mockAuthState = {
      user: { id: 'user_1', email: 'test@example.com', user_metadata: { full_name: 'Test User' } },
      isAuthenticated: true,
    };

    const onComplete = vi.fn();

    const queries = render(<EliteQuestionnaireV2 onComplete={onComplete} />);

    await runToLastQuestion(queries);

    // Answer last question and click generate
    answerCurrentQuestion(queries);
    click(queries.getByTestId('strategy-next'));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
