import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session) return <Navigate to="/chats" replace />;
  return <Outlet />;
}
