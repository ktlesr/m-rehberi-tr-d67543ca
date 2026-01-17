import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Loading fallback component
export const PageLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Yükleniyor...</p>
    </div>
  </div>
);

// Card loading skeleton
export const CardLoadingFallback = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <div className="grid grid-cols-2 gap-4 mt-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  </div>
);

// Chart loading skeleton
export const ChartLoadingFallback = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-6 w-1/4" />
    <Skeleton className="h-[300px] w-full" />
  </div>
);

// Create lazy component with custom fallback
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback: ReactNode = <PageLoadingFallback />
) {
  const LazyComponent = lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// ======================
// Lazy loaded pages
// ======================

// Admin pages
export const LazyAdmin = lazy(() => import('@/pages/Admin'));
export const LazyAdminSupportPrograms = lazy(() => import('@/pages/AdminSupportPrograms'));
export const LazyAdminAnnouncements = lazy(() => import('@/pages/AdminAnnouncements'));
export const LazyAdminNewsletterSubscribers = lazy(() => import('@/pages/AdminNewsletterSubscribers'));
export const LazyAdminFeasibilityReports = lazy(() => import('@/pages/AdminFeasibilityReports'));
export const LazyAdminAnalytics = lazy(() => import('@/pages/AdminAnalytics'));
export const LazyQAManagement = lazy(() => import('@/pages/QAManagement'));
export const LazyAdminEmailManagement = lazy(() => import('@/pages/AdminEmailManagement'));
export const LazyAdminUserManagement = lazy(() => import('@/pages/AdminUserManagement'));
export const LazyAdminGlossaryManagement = lazy(() => import('@/pages/AdminGlossaryManagement'));
export const LazyAdminIncentiveSettings = lazy(() => import('@/pages/AdminIncentiveSettings'));
export const LazyAdminMenuSettings = lazy(() => import('@/pages/AdminMenuSettings'));
export const LazyAdminLegislation = lazy(() => import('@/pages/AdminLegislation'));
export const LazyAdminKnowledgeBase = lazy(() => import('@/pages/AdminKnowledgeBase'));
export const LazyAdminFormBuilder = lazy(() => import('@/pages/AdminFormBuilder'));
export const LazyAdminFormBuilderEdit = lazy(() => import('@/pages/AdminFormBuilderEdit'));
export const LazyAdminFormBuilderSubmissions = lazy(() => import('@/pages/AdminFormBuilderSubmissions'));
export const LazyAdminQnaSettings = lazy(() => import('@/pages/AdminQnaSettings'));
export const LazyAdminYdoSettings = lazy(() => import('@/pages/AdminYdoSettings'));

// TZY Admin pages
export const LazyTZYPreRequestList = lazy(() => import('@/pages/admin/TZYPreRequestList'));
export const LazyTZYCompanyEdit = lazy(() => import('@/pages/admin/TZYCompanyEdit'));
export const LazyTZYProductAdd = lazy(() => import('@/pages/admin/TZYProductAdd'));
export const LazyTZYProductList = lazy(() => import('@/pages/admin/TZYProductList'));
export const LazyTZYEmailLogs = lazy(() => import('@/pages/admin/TZYEmailLogs'));
export const LazyTZYSupplierApplications = lazy(() => import('@/pages/admin/TZYSupplierApplications'));

// Heavy public pages
export const LazyChat = lazy(() => import('@/pages/Chat'));
export const LazyIncentiveTools = lazy(() => import('@/pages/IncentiveTools'));
export const LazyInvestmentOpportunities = lazy(() => import('@/pages/InvestmentOpportunities'));
export const LazyUserProfile = lazy(() => import('@/pages/UserProfile'));
export const LazySearchSupport = lazy(() => import('@/pages/SearchSupport'));

// TZY public pages
export const LazyTZY = lazy(() => import('@/pages/TZY'));
export const LazyTZYPublicList = lazy(() => import('@/pages/TZYPublicList'));
export const LazyTZYOTG = lazy(() => import('@/pages/TZYOTG'));
export const LazyTZYKayitliTalepler = lazy(() => import('@/pages/TZYKayitliTalepler'));
export const LazyTZYTalepler = lazy(() => import('@/pages/TZYTalepler'));
export const LazyTZYSupplierApplication = lazy(() => import('@/pages/TZYSupplierApplication'));
