import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      sessionStorage.clear();
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 border border-rose-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4 backdrop-blur-md">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-rose-400">
                काहीतरी तांत्रिक त्रुटी आली आहे
              </h2>
              <p className="text-sm text-slate-300">
                Something went wrong in the application.
              </p>
              <p className="text-xs text-slate-400 pt-1">
                कृपया ॲप्लिकेशन रीलोड करा किंवा मुख्य पृष्ठावर जा.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950/60 p-3 rounded-xl border border-slate-700/50 max-h-32 overflow-y-auto text-[11px] font-mono text-rose-300">
                <div className="font-bold text-slate-400 mb-1">Error Details:</div>
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md shadow-emerald-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>पुन्हा लोड करा (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
