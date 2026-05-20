import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Leads from './pages/Leads'
import Knowledge from './pages/Knowledge'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './hooks/use-auth'
import { Activity } from 'lucide-react'

const ProtectedRoute = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Activity className="animate-spin text-primary w-8 h-8" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/knowledge" element={<Knowledge />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
