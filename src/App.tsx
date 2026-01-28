import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LogoSettingsProvider } from "@/contexts/LogoSettingsContext";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import ProtectedMenuRoute from "@/components/ProtectedMenuRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import SkipLinks from "@/components/SkipLinks";
import { 
  PageLoadingFallback,
  LazyAdmin,
  LazyAdminSupportPrograms,
  LazyAdminAnnouncements,
  LazyAdminNewsletterSubscribers,
  LazyAdminFeasibilityReports,
  LazyAdminAnalytics,
  LazyQAManagement,
  LazyAdminEmailManagement,
  LazyAdminUserManagement,
  LazyAdminGlossaryManagement,
  LazyAdminIncentiveSettings,
  LazyAdminMenuSettings,
  LazyAdminLegislation,
  LazyAdminKnowledgeBase,
  LazyAdminFormBuilder,
  LazyAdminQnaSettings,
  LazyAdminYdoSettings,
  LazyAdminFormBuilderEdit,
  LazyAdminFormBuilderSubmissions,
  LazyTZYPreRequestList,
  LazyTZYCompanyEdit,
  LazyTZYProductAdd,
  LazyTZYProductList,
  LazyTZYEmailLogs,
  LazyTZYSupplierApplications,
  LazyChat,
  LazyIncentiveTools,
  LazyInvestmentOpportunities,
  LazyUserProfile,
  LazySearchSupport,
  LazyTZY,
  LazyTZYPublicList,
  LazyTZYOTG,
  LazyTZYKayitliTalepler,
  LazyTZYTalepler,
  LazyTZYSupplierApplication,
} from "@/components/LazyComponents";

// Eagerly loaded pages (critical path)
import Index from "./pages/Index";
import Start from "./pages/Start";
import Announcements from "./pages/Announcements";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import ProgramDetails from "./pages/ProgramDetails";
import SupportSummary from "./pages/SupportSummary";
import PublicForm from "./pages/PublicForm";
import Legislation from "./pages/Legislation";
import QNA from "./pages/QNA";
import InvestorGlossary from "./pages/InvestorGlossary";
import TermsOfUse from "./pages/TermsOfUse";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ApplicationProcess from "./pages/ApplicationProcess";
import YdoSecureAccess from "./pages/YdoSecureAccess";
import TZYOTGBasarili from "./pages/TZYOTGBasarili";
import TZYOTGBasarisiz from "./pages/TZYOTGBasarisiz";
import TZYSupplierApplicationSuccess from "./pages/TZYSupplierApplicationSuccess";
import TZYSupplierApplicationError from "./pages/TZYSupplierApplicationError";

// Lazy load heavy components
const AccessibilityWidget = lazy(() => import("@/components/AccessibilityWidget"));
const ReadingGuide = lazy(() => import("@/components/ReadingGuide"));
const ReadingMask = lazy(() => import("@/components/ReadingMask"));
const AIChatbot = lazy(() => import("@/components/AIChatbot").then(m => ({ default: m.AIChatbot })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <LogoSettingsProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <SkipLinks />
                  <ScrollToTop />
                  <Suspense fallback={null}>
                    <AccessibilityWidget />
                    <ReadingGuide />
                    <ReadingMask />
                    <AIChatbot />
                  </Suspense>
                  <Routes>
                    {/* Critical path - eagerly loaded */}
                    <Route path="/" element={<Index />} />
                    <Route path="/start" element={<Start />} />
                    <Route path="/duyurular" element={<Announcements />} />
                    <Route path="/duyuru/:id" element={<AnnouncementDetail />} />
                    <Route path="/mevzuat" element={<Legislation />} />
                    <Route path="/program/:id" element={<ProgramDetails />} />
                    <Route path="/program/:id/ozet" element={<SupportSummary />} />
                    <Route path="/form/:slug" element={<PublicForm />} />
                    <Route path="/kullanim-kosullari" element={<TermsOfUse />} />
                    <Route path="/gizlilik" element={<PrivacyPolicy />} />
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="*" element={<NotFound />} />
                    
                    {/* Public pages with lazy loading */}
                    <Route path="/incentive-tools" element={
                      <ProtectedMenuRoute settingKey="menu_item_tesvik_araclari">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyIncentiveTools />
                        </Suspense>
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/yatirim-firsatlari" element={
                      <ProtectedMenuRoute settingKey="menu_item_yatirim_firsatlari">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyInvestmentOpportunities />
                        </Suspense>
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/chat" element={
                      <ProtectedMenuRoute settingKey="menu_item_chat">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyChat />
                        </Suspense>
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/searchsupport" element={
                      <ProtectedMenuRoute settingKey="menu_item_destek_arama">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazySearchSupport />
                        </Suspense>
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/qna" element={
                      <ProtectedMenuRoute settingKey="menu_item_soru_cevap">
                        <QNA />
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/investor-glossary" element={
                      <ProtectedMenuRoute settingKey="menu_item_yatirimci_sozlugu">
                        <InvestorGlossary />
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/basvuru-sureci" element={
                      <ProtectedMenuRoute settingKey="menu_item_basvuru_sureci">
                        <ApplicationProcess />
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/ydo/secure-access" element={<YdoSecureAccess />} />
                    
                    {/* TZY Routes */}
                    <Route path="/tzy" element={
                      <ProtectedMenuRoute settingKey="menu_item_tedarik_zinciri">
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZY />
                        </Suspense>
                      </ProtectedMenuRoute>
                    } />
                    <Route path="/tzyil" element={
                      <Suspense fallback={<PageLoadingFallback />}>
                        <LazyTZYPublicList />
                      </Suspense>
                    } />
                    <Route path="/tzyotg" element={
                      <Suspense fallback={<PageLoadingFallback />}>
                        <LazyTZYOTG />
                      </Suspense>
                    } />
                    <Route path="/tzy/otg/basarili" element={<TZYOTGBasarili />} />
                    <Route path="/tzy/otg/basarisiz" element={<TZYOTGBasarisiz />} />
                    <Route path="/tzy/kayitli-talepler" element={
                      <Suspense fallback={<PageLoadingFallback />}>
                        <LazyTZYKayitliTalepler />
                      </Suspense>
                    } />
                    <Route path="/tzy/talepler/:on_request_id" element={
                      <Suspense fallback={<PageLoadingFallback />}>
                        <LazyTZYTalepler />
                      </Suspense>
                    } />
                    <Route path="/tzy/talepler/basvuru/:on_request_id/:product_id" element={
                      <Suspense fallback={<PageLoadingFallback />}>
                        <LazyTZYSupplierApplication />
                      </Suspense>
                    } />
                    <Route path="/tzy/supplier-application/success" element={<TZYSupplierApplicationSuccess />} />
                    <Route path="/tzy/supplier-application/error" element={<TZYSupplierApplicationError />} />
                    
                    {/* Admin Routes - All Lazy Loaded */}
                    <Route path="/admin" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdmin />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/support-programs" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminSupportPrograms />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/announcements" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminAnnouncements />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/newsletter-subscribers" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminNewsletterSubscribers />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/feasibility-reports" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminFeasibilityReports />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/feasibility-statistics" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminAnalytics />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/analytics" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminAnalytics />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/qa-management" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyQAManagement />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/user-management" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminUserManagement />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/email-management" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminEmailManagement />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyUserProfile />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/glossary-management" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminGlossaryManagement />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/settings/incentive-calculation" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminIncentiveSettings />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/settings/menu-visibility" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminMenuSettings />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/settings/qna" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminQnaSettings />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/settings/ydo" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminYdoSettings />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzyotl" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYPreRequestList />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzy-company-edit/:taxId" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYCompanyEdit />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzyue/:taxId" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYProductAdd />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzyutl" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYProductList />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzy-email-logs" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYEmailLogs />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/tzy-supplier-applications" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyTZYSupplierApplications />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/legislation" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminLegislation />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/knowledge-base" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminKnowledgeBase />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/form-builder" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminFormBuilder />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/form-builder/new" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminFormBuilderEdit />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/form-builder/:id" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminFormBuilderEdit />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                    <Route path="/admin/form-builder/:id/submissions" element={
                      <ProtectedAdminRoute>
                        <Suspense fallback={<PageLoadingFallback />}>
                          <LazyAdminFormBuilderSubmissions />
                        </Suspense>
                      </ProtectedAdminRoute>
                    } />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </LogoSettingsProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;