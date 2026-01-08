import './App.css'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdaptiveGalaxy from '../components/background/AdaptiveGalaxy'
import Navbar from '../components/layout/Navbar'
import MobileNav from '../components/layout/MobileNav'
import MobileHeader from '../components/layout/MobileHeader'
import LoginButton from '../components/layout/LoginButton'
import Home from '../pages/home/Home'
import About from '../pages/About'
import Events from '../pages/Events'
import Members from '../pages/Members'
import Join from '../pages/Join'
import Contact from '../pages/Contact'
import Merch from '../pages/Merch'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import ForgotPassword from '../pages/ForgotPassword'
import Dashboard from '../pages/Dashboard'
import AdminSetup from '../components/admin/AdminSetup'
import ApplicationsManager from '../components/admin/ApplicationsManager'
import ManageQueries from '../components/admin/ManageQueries'
import MerchOrdersManager from '../components/admin/MerchOrdersManager'
import MerchManager from '../components/admin/MerchManager'
import EventScanner from '../pages/EventScanner'
import ScanQRs from '../pages/ScanQRs'
import { ToastProvider } from '../components/toast/Toast'
import { AuthProvider } from '../contexts/AuthContext'
import { SnowfallProvider } from '../contexts/SnowfallContext'
import { RecruitmentProvider, useRecruitment } from '../contexts/RecruitmentContext'
import { ProtectedRoute, PublicRoute } from '../components/auth'
import BackButton from '../components/navigation/BackButton'
import ScrollToTop from '../components/navigation/ScrollToTop'

// Component to handle Join route protection based on recruitment status
function JoinRoute() {
  const { isRecruitmentOpen, isLoading } = useRecruitment();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  if (!isRecruitmentOpen) {
    return <Navigate to="/about" replace />;
  }

  return <Join />;
}

function AppContent() {
  return (
    <HashRouter>
      <AdaptiveGalaxy />
      <ScrollToTop />
      <BackButton />
      <Navbar />
      <MobileHeader />
      <LoginButton />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/events" element={<Events />} />
        <Route path="/members" element={<Members />} />
        <Route path="/join" element={<JoinRoute />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/merch" element={<Merch />} />

        {/* Auth Routes - Redirect to dashboard if already logged in */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Setup - URL only access (no frontend link) */}
        <Route path="/admin-setup" element={<AdminSetup />} />

        {/* Protected Routes - Require authentication */}
        <Route path="/user-dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Admin Protected Routes */}
        <Route path="/manage-user-applications" element={
          <ProtectedRoute>
            <ApplicationsManager />
          </ProtectedRoute>
        } />
        <Route path="/manage-user-queries" element={
          <ProtectedRoute>
            <ManageQueries />
          </ProtectedRoute>
        } />
        <Route path="/manage-merch-orders" element={
          <ProtectedRoute>
            <MerchOrdersManager />
          </ProtectedRoute>
        } />
        <Route path="/manage-merch" element={
          <ProtectedRoute>
            <MerchManager />
          </ProtectedRoute>
        } />
        <Route path="/event-scanner" element={
          <ProtectedRoute>
            <EventScanner />
          </ProtectedRoute>
        } />
        <Route path="/scan-qrs" element={
          <ProtectedRoute>
            <ScanQRs />
          </ProtectedRoute>
        } />
      </Routes>
      <MobileNav />
    </HashRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <SnowfallProvider>
        <RecruitmentProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </RecruitmentProvider>
      </SnowfallProvider>
    </AuthProvider>
  )
}

export default App
