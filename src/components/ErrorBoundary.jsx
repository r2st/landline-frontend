import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catch render/runtime errors in the subtree and show a fallback instead of a
 * blank white screen. Used at two levels:
 *  - top-level in main.jsx (last-resort catch-all for the whole app)
 *  - per-route inside ProtectedShell so one broken page doesn't take down the
 *    sidebar/layout — `resetKey` (the pathname) remounts the boundary on nav.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prevProps) {
    // Reset on navigation so a caught error on one route clears when the user
    // moves to another.
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info?.componentStack);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback({ error: this.state.error, reset: this.handleReset });
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[16rem] p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-brand-600 mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h1>
          <p className="text-sm text-gray-600 mb-4 max-w-md">
            This part of the app hit an unexpected error. You can try again, or reload the page.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
