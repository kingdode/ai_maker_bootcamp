'use client';

import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // Here you could send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-6 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Error fallback for offers grid
 */
export function OffersError() {
  return (
    <div className="p-8 text-center bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="text-5xl mb-4">📭</div>
      <h2 className="text-xl font-bold text-red-400 mb-2">Failed to load offers</h2>
      <p className="text-gray-400 text-sm">
        Please try refreshing the page. If the problem persists, check your internet connection.
      </p>
    </div>
  );
}

/**
 * Error fallback for featured deals
 */
export function FeaturedDealsError() {
  return (
    <div className="p-6 text-center bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
      <div className="text-4xl mb-3">⭐</div>
      <h2 className="text-lg font-bold text-yellow-400 mb-1">Featured deals unavailable</h2>
      <p className="text-gray-400 text-sm">
        Check back later for promoted deals.
      </p>
    </div>
  );
}

/**
 * Error fallback for stats
 */
export function StatsError() {
  return (
    <div className="p-4 text-center bg-gray-500/10 border border-gray-500/30 rounded-lg">
      <p className="text-gray-400 text-sm">Statistics temporarily unavailable</p>
    </div>
  );
}
