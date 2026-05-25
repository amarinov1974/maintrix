import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AccessCodeGate, { children: _jsx(SessionProvider, { children: _jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(EntryScreen, {}) }), _jsx(Route, { path: "/store-manager", element: _jsx(ProtectedRoute, { allowedRoles: ['SM'], children: _jsx(StoreManagerDashboard, {}) }) }), _jsx(Route, { path: "/store-manager/action-required", element: _jsx(ProtectedRoute, { allowedRoles: ['SM'], children: _jsx(SMActionRequiredPage, {}) }) }), _jsx(Route, { path: "/store-manager/drafts", element: _jsx(ProtectedRoute, { allowedRoles: ['SM'], children: _jsx(SMDraftsPage, {}) }) }), _jsx(Route, { path: "/store-manager/qr-required", element: _jsx(ProtectedRoute, { allowedRoles: ['SM'], children: _jsx(SMQRRequiredPage, {}) }) }), _jsx(Route, { path: "/store-manager/submit", element: _jsx(ProtectedRoute, { allowedRoles: ['SM'], children: _jsx(SubmitTicketPage, { backLink: "/store-manager", backLabel: "Back" }) }) }), _jsx(Route, { path: "/area-manager", element: _jsx(ProtectedRoute, { allowedRoles: ['AM'], children: _jsx(AreaManagerDashboard, {}) }) }), _jsx(Route, { path: "/amm", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMDashboard, {}) }) }), _jsx(Route, { path: "/amm/urgent-tickets", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMUrgentTicketsPage, {}) }) }), _jsx(Route, { path: "/amm/cost-estimation-tickets", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMCostEstimationTicketsPage, {}) }) }), _jsx(Route, { path: "/amm/approved-cost-tickets", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMApprovedCostTicketsPage, {}) }) }), _jsx(Route, { path: "/amm/work-in-progress-tickets", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMWorkInProgressTicketsPage, {}) }) }), _jsx(Route, { path: "/amm/cost-proposal-work-orders", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMCostProposalWorkOrdersPage, {}) }) }), _jsx(Route, { path: "/amm/follow-up-work-orders", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMFollowUpWorkOrdersPage, {}) }) }), _jsx(Route, { path: "/amm/work-orders-with-vendor", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMWorkOrdersWithVendorPage, {}) }) }), _jsx(Route, { path: "/amm/returned-work-orders", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(AMMReturnedWorkOrdersPage, {}) }) }), _jsx(Route, { path: "/amm/submit", element: _jsx(ProtectedRoute, { allowedRoles: ['AMM'], children: _jsx(SubmitTicketPage, { backLink: "/amm", backLabel: "Back" }) }) }), _jsx(Route, { path: "/director", element: _jsx(ProtectedRoute, { allowedRoles: ['D', 'C2', 'BOD'], children: _jsx(DirectorDashboard, {}) }) }), _jsx(Route, { path: "/admin", element: _jsx(ProtectedRoute, { allowedRoles: ['ADMIN'], children: _jsx(AdminDashboard, {}) }) }), _jsx(Route, { path: "/energy/stores", element: _jsx(ProtectedRoute, { allowedRoles: ['ADMIN'], children: _jsx(EnergyStoreListPage, {}) }) }), _jsx(Route, { path: "/energy/stores/:id", element: _jsx(ProtectedRoute, { allowedRoles: ['ADMIN'], children: _jsx(EnergyStorePage, {}) }) }), _jsx(Route, { path: "/assets", element: _jsx(ProtectedRoute, { allowedRoles: ['AM', 'AMM', 'D', 'C2', 'BOD', 'ADMIN'], children: _jsx(AssetListPage, {}) }) }), _jsx(Route, { path: "/assets/:id", element: _jsx(ProtectedRoute, { allowedRoles: ['AM', 'AMM', 'D', 'C2', 'BOD', 'ADMIN'], children: _jsx(AssetDetailPage, {}) }) }), _jsx(Route, { path: "/vendor/s1", element: _jsx(ProtectedRoute, { allowedRoles: ['S1'], children: _jsx(S1Dashboard, {}) }) }), _jsx(Route, { path: "/vendor/s2", element: _jsx(ProtectedRoute, { allowedRoles: ['S2'], children: _jsx(S2Dashboard, {}) }) }), _jsx(Route, { path: "/vendor/s3", element: _jsx(ProtectedRoute, { allowedRoles: ['S3'], children: _jsx(S3Dashboard, {}) }) }), _jsx(Route, { path: "/vendor/s3/my-work-orders/:filter", element: _jsx(ProtectedRoute, { allowedRoles: ['S3'], children: _jsx(S3MyWorkOrdersPage, {}) }) })] }) }) }) }) }));
}
export default App;
