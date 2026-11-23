import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

function parseFriendlyMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
    if (parsed.error?.includes('Missing or insufficient permissions')) {
      return `Access restricted for ${parsed.operationType || 'operation'} on ${parsed.path || 'record'}. Please sign in with a verified account or contact our team.`;
    }
    if (parsed.error) return parsed.error;
  } catch {
    // Plain error message
  }
  if (raw.toLowerCase().includes('offline')) {
    return 'Network connection is offline. Reconnect to sync your bookings and saved stays.';
  }
  return raw || 'An unexpected error occurred while rendering this view.';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: parseFriendlyMessage(error.message),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7d9c6] p-6 text-[#1d1a1c]">
        <div className="w-full max-w-[480px] rounded-[22px] bg-[#fdf0e7] p-8 text-center shadow-2xl">
          <AlertTriangle className="mx-auto h-10 w-10 text-[#f39419]" strokeWidth={1.6} />
          <h1 className="mt-4 font-display-serif text-[28px] leading-tight">
            Something Interrupted Your View
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[#5c5156]">
            {this.state.message}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = import.meta.env.BASE_URL || '/';
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#1d1a1c] px-6 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <RotateCcw className="h-4 w-4" />
              Return to Kemet Travel
            </button>
          </div>
        </div>
      </div>
    );
  }
}
