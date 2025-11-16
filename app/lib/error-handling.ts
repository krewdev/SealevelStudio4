// Centralized error handling utilities
// Provides user-friendly error messages and error recovery strategies

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  context?: Record<string, any>;
}

/**
 * Convert various error types to user-friendly messages
 */
export function formatError(error: unknown): AppError {
  if (error instanceof Error) {
    // Solana-specific errors
    if (error.message.includes('User rejected')) {
      return {
        code: 'USER_REJECTED',
        message: error.message,
        userMessage: 'Transaction was cancelled. Please try again if you want to proceed.',
        recoverable: true,
        retryable: true,
      };
    }

    if (error.message.includes('insufficient funds') || error.message.includes('0x1')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: error.message,
        userMessage: 'Insufficient funds. Please ensure you have enough SOL to cover transaction fees.',
        recoverable: true,
        retryable: false,
      };
    }

    if (error.message.includes('0x0') || error.message.includes('InvalidAccountData')) {
      return {
        code: 'INVALID_ACCOUNT',
        message: error.message,
        userMessage: 'Invalid account data. Please check that all account addresses are correct.',
        recoverable: true,
        retryable: true,
      };
    }

    if (error.message.includes('Network') || error.message.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        userMessage: 'Network error. Please check your connection and try again.',
        recoverable: true,
        retryable: true,
      };
    }

    if (error.message.includes('RPC') || error.message.includes('429')) {
      return {
        code: 'RPC_ERROR',
        message: error.message,
        userMessage: 'RPC rate limit exceeded. Please wait a moment and try again.',
        recoverable: true,
        retryable: true,
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      recoverable: false,
      retryable: true,
    };
  }

  // Non-Error types
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    userMessage: 'An unexpected error occurred. Please try again.',
    recoverable: false,
    retryable: true,
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const appError = formatError(error);
  return appError.retryable;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  return formatError(error).userMessage;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const appError = formatError(error);
  console.error('[App Error]', {
    code: appError.code,
    message: appError.message,
    userMessage: appError.userMessage,
    context,
  });
}

/**
 * Create error boundary message
 */
export function createErrorBoundaryMessage(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  const appError = formatError(error);

  return {
    title: 'Something went wrong',
    message: appError.userMessage,
    action: appError.retryable ? 'Try Again' : undefined,
  };
}

