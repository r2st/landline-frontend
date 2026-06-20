import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Import = lazy(() => import('./pages/Import'));
const Sequences = lazy(() => import('./pages/Sequences'));
const Outreach = lazy(() => import('./pages/Outreach'));
const FollowUps = lazy(() => import('./pages/FollowUps'));
const Settings = lazy(() => import('./pages/Settings'));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-4">Page Not Found</p>
      <a href="/" className="text-blue-600 hover:text-blue-800 underline">
        Go back to home
      </a>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/import" element={<Import />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
