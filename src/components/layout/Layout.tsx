import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const shouldShowFooter = location.pathname === '/' && !currentUser;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-14 sm:pt-16 transition-all duration-300 main-content">
        {children}
      </main>
      {shouldShowFooter && <Footer />}
    </div>
  );
};

export default Layout;