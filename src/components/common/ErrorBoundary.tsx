"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Here you could send to error tracking service like Sentry
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = "/dashboard";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white border border-red-200 rounded-2xl shadow-lg p-8 max-w-lg w-full text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              אופס! משהו השתבש
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              אירעה שגיאה בלתי צפויה. אנחנו מצטערים על אי הנוחות.
            </p>

            {/* Error details (optional) */}
            {this.props.showDetails && this.state.error && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl text-right">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  פרטי השגיאה:
                </p>
                <p className="text-xs text-red-600 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="text-xs text-gray-400 mt-2 overflow-auto max-h-32 text-left">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                <Home className="w-4 h-4" />
                חזור לדף הבית
              </button>
            </div>

            {/* Reload hint */}
            <p className="text-xs text-gray-400 mt-4">
              אם הבעיה נמשכת,{" "}
              <button
                onClick={this.handleReload}
                className="text-primary-500 hover:underline"
              >
                רענן את הדף
              </button>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// HOOK FOR FUNCTIONAL COMPONENTS
// ============================================

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((err: Error) => {
    setError(err);
    console.error("Error captured:", err);
  }, []);

  // Throw error to be caught by ErrorBoundary
  if (error) {
    throw error;
  }

  return { captureError, resetError };
}

// ============================================
// WRAPPER COMPONENT FOR EASY USE
// ============================================

interface WithErrorBoundaryProps {
  children: ReactNode;
  name?: string;
}

export function WithErrorBoundary({ children, name }: WithErrorBoundaryProps) {
  return (
    <ErrorBoundary
      onError={(error, info) => {
        console.error(`Error in ${name || "component"}:`, error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
