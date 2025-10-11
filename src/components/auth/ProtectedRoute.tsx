import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, requireAuth = true, adminOnly = false }: ProtectedRouteProps) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não requer autenticação e usuário está logado, redireciona baseado em isAdmin
  if (!requireAuth && currentUser && userData) {
    if (userData.isAdmin) {
      return <Navigate to="/profile" replace />;
    } else {
      return <Navigate to="/profile-mobile" replace />;
    }
  }

  // Se requer autenticação e usuário não está logado, redireciona para login
  if (requireAuth && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Se requer admin e usuário não é admin
  if (adminOnly && userData && !userData.isAdmin) {
    return <Navigate to="/profile-mobile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;