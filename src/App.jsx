import React, { Suspense, lazy } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Import = lazy(() => import('./pages/Import'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Prospecting = lazy(() => import('./pages/Prospecting'));
const Sequences = lazy(() => import('./pages/Sequences'));
const Outreach = lazy(() => import('./pages/Outreach'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Groups = lazy(() => import('./pages/Groups'));
const NewsFeed = lazy(() => import('./pages/NewsFeed'));
const Settings = lazy(() => import('./pages/Settings'));
const Demos = lazy(() => import('./pages/Demos'));
const CardScanner = lazy(() => import('./pages/CardScanner'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Reports = lazy(() => import('./pages/Reports'));
const DailyActivity = lazy(() => import('./pages/DailyActivity'));
const DialtoneConsole = lazy(() => import('./pages/DialtoneConsole'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const Calls = lazy(() => import('./pages/Calls'));
const Investors = lazy(() => import('./pages/Investors'));
const InvestorDetail = lazy(() => import('./pages/InvestorDetail'));
const SentimentDashboard = lazy(() => import('./pages/SentimentDashboard'));
const Login = lazy(() => import('./pages/Login'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-4">Page Not Found</p>
      <a href="/" className="text-brand-600 hover:text-brand-800 underline">
        Go back to home
      </a>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>
  );
}

// Authenticated app shell: gate on auth, then render the sidebar layout with the
// matched page inside a Suspense boundary (for the lazy route chunks).
function ProtectedShell() {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <Layout>
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public / auth routes — rendered without the app layout. */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Everything below requires authentication. */}
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/import" element={<Import />} />
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/prospecting" element={<Prospecting />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/news" element={<NewsFeed />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/demos" element={<Demos />} />
          <Route path="/scan" element={<CardScanner />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/client-dashboard" element={<ClientDashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/daily-activity" element={<DailyActivity />} />
          <Route path="/dialtone" element={<DialtoneConsole />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/investors" element={<Investors />} />
          <Route path="/investors/:id" element={<InvestorDetail />} />
          <Route path="/sentiment" element={<SentimentDashboard />} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
