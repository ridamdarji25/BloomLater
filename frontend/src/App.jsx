import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import Navbar from '@/components/layout/Navbar';
import Landing from '@/pages/Landing';
import Vault from '@/pages/Vault';
import Create from '@/pages/Create';
import CapsulePage from '@/pages/CapsulePage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

/** Guard: redirect to /login if not authenticated */
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

/** Guard: redirect to /vault if already authenticated */
function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/vault" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/vault"
              element={
                <PrivateRoute>
                  <Vault />
                </PrivateRoute>
              }
            />
            <Route
              path="/create"
              element={
                <PrivateRoute>
                  <Create />
                </PrivateRoute>
              }
            />
            <Route
              path="/capsule/:id"
              element={
                <PrivateRoute>
                  <CapsulePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontSize: '14px',
              background: '#1A1A14',
              color: '#F5F0E8',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid rgba(245,240,232,0.08)',
            },
            success: {
              iconTheme: { primary: '#4A5C2F', secondary: '#F5F0E8' },
            },
            error: {
              iconTheme: { primary: '#C4541A', secondary: '#F5F0E8' },
            },
          }}
        />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
