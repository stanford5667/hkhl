import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, XCircle, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  variant?: 'default' | 'calculation' | 'inline';
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorType: 'generic' | 'rate-limit' | 'network' | 'calculation' | 'data';
}

// Error type detection
function detectErrorType(error: Error): ErrorBoundaryState['errorType'] {
  const message = error.message.toLowerCase();
  
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return 'rate-limit';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('failed to fetch')) {
    return 'network';
  }
  if (message.includes('division by zero') || message.includes('nan') || message.includes('infinity') || message.includes('calculation')) {
    return 'calculation';
  }
  if (message.includes('no data') || message.includes('invalid ticker') || message.includes('cache miss')) {
    return 'data';
  }
  
  return 'generic';
}

// Error info configs
const ERROR_CONFIGS = {
  'rate-limit': {
    icon: Clock,
    title: 'API Rate Limit Exceeded',
    description: 'We\'ve made too many requests. Please wait a moment before trying again.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  'network': {
    icon: WifiOff,
    title: 'Network Error',
    description: 'Unable to connect to the server. Check your internet connection and try again.',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  'calculation': {
    icon: XCircle,
    title: 'Calculation Error',
    description: 'An error occurred during calculations. This may be due to invalid data or insufficient trading days.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  'data': {
    icon: AlertTriangle,
    title: 'Data Unavailable',
    description: 'Unable to retrieve market data. The ticker may be invalid or data may not be available.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  'generic': {
    icon: AlertTriangle,
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
  },
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: 'generic',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorType: detectErrorType(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorType: 'generic',
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const config = ERROR_CONFIGS[this.state.errorType];
      const Icon = config.icon;
      const { variant = 'default', className } = this.props;

      // Inline variant - compact alert
      if (variant === 'inline') {
        return (
          <Alert className={cn(config.borderColor, config.bgColor, className)}>
            <Icon className={cn('h-4 w-4', config.color)} />
            <AlertTitle className={config.color}>{config.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">{config.description}</span>
              <Button variant="ghost" size="sm" onClick={this.handleRetry} className="ml-2">
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        );
      }

      // Calculation variant - more technical details
      if (variant === 'calculation') {
        return (
          <Card className={cn('border-2', config.borderColor, className)}>
            <CardHeader className={cn('pb-3', config.bgColor)}>
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', config.bgColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>
                <div>
                  <CardTitle className="text-base">{config.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Technical Details:</p>
                  <code className="text-xs text-foreground block overflow-x-auto">
                    {this.state.error.message}
                  </code>
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      }

      // Default variant
      return (
        <Card className={cn('border-2', config.borderColor, className)}>
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn('p-4 rounded-full', config.bgColor)}>
                <Icon className={cn('h-8 w-8', config.color)} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{config.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {config.description}
                </p>
              </div>
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
