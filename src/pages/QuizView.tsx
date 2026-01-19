import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  correct_answer: string;
  points: number;
  order_index: number;
}

export default function QuizView() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Fetch quiz details
  const { data: quiz } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch quiz questions
  const { data: questions } = useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (error) throw error;
      return data as QuizQuestion[];
    },
  });

  // Fetch user's previous attempts
  const { data: attempts } = useQuery({
    queryKey: ['quiz-attempts', quizId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Timer effect
  useEffect(() => {
    if (!quizStarted || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time runs out
          if (prev === 1) {
            handleSubmitQuiz();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeRemaining]);

  // Submit quiz mutation
  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!user || !questions) throw new Error('Invalid state');

      // Calculate score
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      let earnedPoints = 0;
      const answersWithResults: any[] = [];

      for (const question of questions) {
        const userAnswer = answers[question.id];
        const isCorrect = userAnswer === question.correct_answer;
        
        if (isCorrect) {
          earnedPoints += question.points || 1;
        }

        answersWithResults.push({
          question_id: question.id,
          user_answer: userAnswer,
          correct_answer: question.correct_answer,
          is_correct: isCorrect,
        });
      }

      const scorePercentage = (earnedPoints / totalPoints) * 100;
      const passed = scorePercentage >= (quiz?.passing_score || 70);

      // Save attempt
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          score: scorePercentage,
          max_score: totalPoints,
          passed,
          answers: answersWithResults,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-attempts'] });
      setQuizCompleted(true);
      
      if (data.passed) {
        toast.success('Congratulations! You passed the quiz!');
      } else {
        toast.error('You did not pass this time. Keep learning and try again!');
      }
    },
  });

  const handleStartQuiz = () => {
    setQuizStarted(true);
    if (quiz?.time_limit) {
      setTimeRemaining(quiz.time_limit * 60);
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextQuestion = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (!questions) return;

    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0 && timeRemaining !== 0) {
      toast.error(`Please answer all questions before submitting (${unansweredQuestions.length} remaining)`);
      return;
    }

    submitQuizMutation.mutate();
  };

  if (!quiz || !questions) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  // Quiz start screen
  if (!quizStarted) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl md:text-3xl mb-4">{quiz.title}</CardTitle>
            <CardDescription className="text-base md:text-lg">{quiz.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Time Limit</span>
                </div>
                <p className="text-xl font-bold">
                  {quiz.time_limit ? `${quiz.time_limit} min` : 'No limit'}
                </p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Pass Score</span>
                </div>
                <p className="text-xl font-bold">{quiz.passing_score}%</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Questions</span>
                </div>
                <p className="text-xl font-bold">{questions.length}</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Attempts</span>
                </div>
                <p className="text-xl font-bold">
                  {attempts?.length || 0} / {quiz.max_attempts || '∞'}
                </p>
              </div>
            </div>

            {attempts && attempts.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Previous Attempts</h3>
                  <div className="space-y-2">
                    {attempts.slice(0, 3).map((attempt: any, index: number) => (
                      <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {attempt.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span>Attempt {attempts.length - index}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            {attempt.score?.toFixed(1)}%
                          </span>
                          <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button 
              onClick={handleStartQuiz} 
              size="lg" 
              className="w-full"
              disabled={!user}
            >
              {!user ? 'Sign in to Start' : 'Start Quiz'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz completed screen
  if (quizCompleted && submitQuizMutation.data) {
    const result = submitQuizMutation.data;
    
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {result.passed ? (
                <Trophy className="w-16 h-16 text-yellow-500" />
              ) : (
                <XCircle className="w-16 h-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl md:text-3xl">
              {result.passed ? 'Congratulations!' : 'Quiz Complete'}
            </CardTitle>
            <CardDescription className="text-base md:text-lg">
              {result.passed 
                ? 'You passed the quiz!'
                : `You scored ${result.score?.toFixed(1)}%. Keep learning and try again!`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-bold mb-2">
                {result.score?.toFixed(1)}%
              </p>
              <p className="text-muted-foreground">
                You needed {quiz.passing_score}% to pass
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-500">
                  {Array.isArray(result.answers) ? result.answers.filter((a: any) => a.is_correct).length : 0}
                </p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-red-500">
                  {Array.isArray(result.answers) ? result.answers.filter((a: any) => !a.is_correct).length : 0}
                </p>
                <p className="text-sm text-muted-foreground">Incorrect</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
                Back to Course
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Retake Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz taking screen
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 text-sm ${timeRemaining < 60 ? 'text-red-500' : ''}`}>
              <Clock className="w-4 h-4" />
              <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
        <Progress value={progressPercentage} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{currentQuestion.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.id]}
              onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            >
              {currentQuestion.options.map((option: string, index: number) => (
                <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <RadioGroup
              value={answers[currentQuestion.id]}
              onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="True" id="true" />
                <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="False" id="false" />
                <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {answeredCount} / {questions.length} answered
            </span>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNextQuestion}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmitQuiz} disabled={submitQuizMutation.isPending}>
                Submit Quiz
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Question navigation dots */}
      <div className="flex flex-wrap gap-2 justify-center mt-6">
        {questions.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentQuestionIndex(index)}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              index === currentQuestionIndex
                ? 'bg-primary text-primary-foreground'
                : answers[questions[index].id]
                ? 'bg-green-500 text-white'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}