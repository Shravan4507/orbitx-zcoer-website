import './App.css'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AdaptiveGalaxy from '../components/background/AdaptiveGalaxy'
import Navbar from '../components/layout/Navbar'
import MobileNav from '../components/layout/MobileNav'
import MobileHeader from '../components/layout/MobileHeader'
import LoginButton from '../components/layout/LoginButton'
import PageTransition from '../components/effects/PageTransition'
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
import ManageMembers from '../pages/ManageMembers'
import AdminSetup from '../components/admin/AdminSetup'
import ApplicationsManager from '../components/admin/ApplicationsManager'
import ManageQueries from '../components/admin/ManageQueries'
import MerchOrdersManager from '../components/admin/MerchOrdersManager'
import MerchManager from '../components/admin/MerchManager'

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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
        <Route path="/members" element={<PageTransition><Members /></PageTransition>} />
        <Route path="/join" element={<PageTransition><JoinRoute /></PageTransition>} />
        <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
        <Route path="/merch" element={<PageTransition><Merch /></PageTransition>} />

        {/* Auth Routes - Redirect to dashboard if already logged in */}
        <Route path="/login" element={
          <PublicRoute>
            <PageTransition><Login /></PageTransition>
          </PublicRoute>
        } />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />

        {/* Admin Setup - URL only access (no frontend link) */}
        <Route path="/admin-setup" element={<PageTransition><AdminSetup /></PageTransition>} />

        {/* Protected Routes - Require authentication */}
        <Route path="/user-dashboard" element={
          <ProtectedRoute>
            <PageTransition><Dashboard /></PageTransition>
          </ProtectedRoute>
        } />

        {/* Admin Protected Routes */}
        <Route path="/manage-user-applications" element={
          <ProtectedRoute>
            <PageTransition><ApplicationsManager /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/manage-user-queries" element={
          <ProtectedRoute>
            <PageTransition><ManageQueries /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/manage-merch-orders" element={
          <ProtectedRoute>
            <PageTransition><MerchOrdersManager /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/manage-merch" element={
          <ProtectedRoute>
            <PageTransition><MerchManager /></PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/manage-members" element={
          <ProtectedRoute>
            <PageTransition><ManageMembers /></PageTransition>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  return (
    <HashRouter>
      <AdaptiveGalaxy />
      <ScrollToTop />
      <div className="desktop-only-back-button">
        <BackButton />
      </div>
      <Navbar />
      <MobileHeader />
      <LoginButton />
      <AnimatedRoutes />
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
