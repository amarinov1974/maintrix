import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from './contexts/SessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccessCodeGate } from './components/AccessCodeGate';
import { EntryScreen } from './pages/EntryScreen';
import { StoreManagerDashboard } from './pages/store-manager/StoreManagerDashboard';
import { SMActionRequiredPage } from './pages/store-manager/SMActionRequiredPage';
import { SMQRRequiredPage } from './pages/store-manager/SMQRRequiredPage';
import { SMDraftsPage } from './pages/store-manager/SMDraftsPage';
import { AMMDashboard } from './pages/amm/AMMDashboard';
import { AMMUrgentTicketsPage } from './pages/amm/AMMUrgentTicketsPage';
import { AMMCostEstimationTicketsPage } from './pages/amm/AMMCostEstimationTicketsPage';
import { AMMApprovedCostTicketsPage } from './pages/amm/AMMApprovedCostTicketsPage';
import { AMMWorkInProgressTicketsPage } from './pages/amm/AMMWorkInProgressTicketsPage';
import { AMMCostProposalWorkOrdersPage } from './pages/amm/AMMCostProposalWorkOrdersPage';
import { AMMFollowUpWorkOrdersPage } from './pages/amm/AMMFollowUpWorkOrdersPage';
import { AMMWorkOrdersWithVendorPage } from './pages/amm/AMMWorkOrdersWithVendorPage';
import { AMMReturnedWorkOrdersPage } from './pages/amm/AMMReturnedWorkOrdersPage';
import { SubmitTicketPage } from './pages/SubmitTicketPage';
import { AreaManagerDashboard } from './pages/area-manager/AreaManagerDashboard';
import { DirectorDashboard } from './pages/director/DirectorDashboard';
import { S1Dashboard } from './pages/vendor/s1/S1Dashboard';
import { S2Dashboard } from './pages/vendor/s2/S2Dashboard';
import { S3Dashboard } from './pages/vendor/s3/S3Dashboard';
import { S3MyWorkOrdersPage } from './pages/vendor/s3/S3MyWorkOrdersPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AssetListPage } from './pages/assets/AssetListPage';
import { AssetDetailPage } from './pages/assets/AssetDetailPage';
import { EnergyStoreListPage } from './pages/energy/EnergyStoreListPage';
import { EnergyStorePage } from './pages/energy/EnergyStorePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccessCodeGate>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<EntryScreen />} />

            <Route
              path="/store-manager"
              element={
                <ProtectedRoute allowedRoles={['SM']}>
                  <StoreManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-manager/action-required"
              element={
                <ProtectedRoute allowedRoles={['SM']}>
                  <SMActionRequiredPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-manager/drafts"
              element={
                <ProtectedRoute allowedRoles={['SM']}>
                  <SMDraftsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-manager/qr-required"
              element={
                <ProtectedRoute allowedRoles={['SM']}>
                  <SMQRRequiredPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/store-manager/submit"
              element={
                <ProtectedRoute allowedRoles={['SM']}>
                  <SubmitTicketPage backLink="/store-manager" backLabel="Back" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/area-manager"
              element={
                <ProtectedRoute allowedRoles={['AM']}>
                  <AreaManagerDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/amm"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/urgent-tickets"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMUrgentTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/cost-estimation-tickets"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMCostEstimationTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/approved-cost-tickets"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMApprovedCostTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/work-in-progress-tickets"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMWorkInProgressTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/cost-proposal-work-orders"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMCostProposalWorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/follow-up-work-orders"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMFollowUpWorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/work-orders-with-vendor"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMWorkOrdersWithVendorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/returned-work-orders"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <AMMReturnedWorkOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/amm/submit"
              element={
                <ProtectedRoute allowedRoles={['AMM']}>
                  <SubmitTicketPage backLink="/amm" backLabel="Back" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/director"
              element={
                <ProtectedRoute allowedRoles={['D', 'C2', 'BOD']}>
                  <DirectorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/energy/stores"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <EnergyStoreListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/energy/stores/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <EnergyStorePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets"
              element={
                <ProtectedRoute allowedRoles={['AM', 'AMM', 'D', 'C2', 'BOD', 'ADMIN']}>
                  <AssetListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assets/:id"
              element={
                <ProtectedRoute allowedRoles={['AM', 'AMM', 'D', 'C2', 'BOD', 'ADMIN']}>
                  <AssetDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/vendor/s1"
              element={
                <ProtectedRoute allowedRoles={['S1']}>
                  <S1Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/s2"
              element={
                <ProtectedRoute allowedRoles={['S2']}>
                  <S2Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/s3"
              element={
                <ProtectedRoute allowedRoles={['S3']}>
                  <S3Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendor/s3/my-work-orders/:filter"
              element={
                <ProtectedRoute allowedRoles={['S3']}>
                  <S3MyWorkOrdersPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
      </AccessCodeGate>
    </QueryClientProvider>
  );
}

export default App;
