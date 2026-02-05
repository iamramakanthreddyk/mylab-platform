import React, { Suspense, ComponentType, ReactNode, lazy } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

/**
 * Lazy Loading Wrapper with Error Boundary
 * 
 * Provides utilities for code-splitting and lazy-loading React components
 * with built-in error handling and loading states.
 * 
 * Usage:
 * const Dashboard = lazy(() => import('./Dashboard'));
 * const SafeDashboard = withLazyLoad(Dashboard);
 */

interface LazyComponentProps {
  fallback?: ReactNode;
  onReset?: () => void;
}

/**
 * Error fallback component for lazy-loaded components
 * Displays a user-friendly error message when a component fails to load
 */
export function LazyErrorFallback(props: Readonly<FallbackProps>) {
  return (
    <div className="flex items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          ⚠️ Failed to load component
        </h3>
        <p className="text-sm text-red-700 mb-4">
          {props.error?.message || 'An error occurred while loading this component'}
        </p>
        <button
          onClick={props.resetErrorBoundary}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

/**
 * Loading fallback for components that haven't loaded yet
 * Shows a spinner while the component is being downloaded
 */
export function LazyLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin">
        <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap any component with error boundary + lazy loading
 * 
 * Usage:
 * const SafeDashboard = withLazyLoad(
 *   lazy(() => import('./Dashboard')),
 *   { fallback: <CustomLoadingSpinner /> }
 * );
 */
export function withLazyLoad<P extends object>(
  Component: ComponentType<P>,
  options?: LazyComponentProps
) {
  return function LazyLoadedComponent(props: P) {
    const { fallback = <LazyLoadingFallback />, onReset } = options || {};

    return (
      <ErrorBoundary
        FallbackComponent={LazyErrorFallback}
        onReset={onReset}
      >
        <Suspense fallback={fallback}>
          <Component {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  };
}

/**
 * For use in route configurations
 * Provides a clean way to handle lazy route loading with error boundaries
 * 
 * Usage in routing:
 * const routes = [
 *   {
 *     path: '/dashboard',
 *     element: <LazyRoute component={() => import('./Dashboard')} />
 *   }
 * ]
 */
export function LazyRoute({ 
  component: importComponent,
  loadingFallback = <LazyLoadingFallback />
}: Readonly<{
  component: () => Promise<{ default: ComponentType<any> }>;
  loadingFallback?: ReactNode;
}>) {
  const Component = lazy(importComponent);

  return (
    <ErrorBoundary FallbackComponent={LazyErrorFallback}>
      <Suspense fallback={loadingFallback}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Example usage in your main App component:
 * 
 * const Dashboard = lazy(() => import('./Dashboard'));
 * const Projects = lazy(() => import('./Projects'));
 * 
 * function App() {
 *   return (
 *     <Routes>
 *       <Route path="/dashboard" element={<withLazyLoad(Dashboard)} />
 *       <Route path="/projects" element={<LazyRoute component={() => import('./Projects')} />}
 *     </Routes>
 *   );
 * }
 */
