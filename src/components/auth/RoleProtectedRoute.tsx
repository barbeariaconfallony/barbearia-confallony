import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'dono' | 'barbeiro' | 'cliente'>;
  redirectTo?: string;
}

export const RoleProtectedRoute = ({ 
  children, 
  allowedRoles,
  redirectTo = "/login" 
}: RoleProtectedRouteProps) => {
  const { currentUser, userData, loading, userRoles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar se o usuário tem pelo menos um dos roles permitidos
  const hasPermission = userRoles.some(role => 
    allowedRoles.includes(role as 'dono' | 'barbeiro' | 'cliente')
  );

  if (!hasPermission) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};
