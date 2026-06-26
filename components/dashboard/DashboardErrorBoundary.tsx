'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Dashboard] unexpected render error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="min-h-[calc(100vh-120px)] rounded-t-2xl bg-white p-5 pb-24 md:p-6 lg:p-6 lg:pb-6">
          <DashboardEmptyState
            headline="Something went wrong"
            body="We had trouble loading your dashboard. Try refreshing — if the problem continues, contact support."
            cta={{ label: 'Refresh', href: '/' }}
          />
        </main>
      );
    }

    return this.props.children;
  }
}
