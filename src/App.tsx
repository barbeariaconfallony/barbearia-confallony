import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { QueueAutomationProvider } from "./contexts/QueueAutomationContext";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./contexts/AuthContext";
import { useInactivityNotification } from "./hooks/useInactivityNotification";
import { useQueueReminders } from "./hooks/useQueueReminders";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import ScrollToTop from "./components/ScrollToTop";
import FloatingMenu from "./components/FloatingMenu";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import BookingLocal from "./pages/BookingLocal";
import BookingMobile from "./pages/BookingMobile";
import Queue from "./pages/Queue";
import Admin from "./pages/Admin";
import ServiceManagement from "./pages/ServiceManagement";
import ProductManagement from "./pages/ProductManagement";
import Comandas from "./pages/Comandas";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentError from "./pages/PaymentError";
import PaymentPending from "./pages/PaymentPending";
import Produtos from "./pages/Produtos";
import ProfileMobile from "./pages/ProfileMobile";
import PixPagamento from "./pages/PixPagamento";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { currentUser } = useAuth();
  useTheme(); // Carrega e aplica o tema globalmente
  useInactivityNotification(currentUser); // Detecta inatividade e envia notificação
  useQueueReminders(currentUser); // Envia lembretes periódicos da fila

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <FloatingMenu />
        <Routes>
            <Route path="/" element={
              <ProtectedRoute requireAuth={false}>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/services" element={
              <ProtectedRoute requireAuth={false}>
                <Services />
              </ProtectedRoute>
            } />
            <Route path="/login" element={
              <ProtectedRoute requireAuth={false}>
                <Login />
              </ProtectedRoute>
            } />
            <Route path="/register" element={
              <ProtectedRoute requireAuth={false}>
                <Register />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/profile-mobile" element={
              <ProtectedRoute>
                <ProfileMobile />
              </ProtectedRoute>
            } />
            <Route path="/booking-local" element={
              <ProtectedRoute>
                <BookingLocal />
              </ProtectedRoute>
            } />
            <Route path="/booking-mobile" element={
              <ProtectedRoute>
                <BookingMobile />
              </ProtectedRoute>
            } />
            <Route path="/queue" element={
              <ProtectedRoute>
                <Queue />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
            <Route path="/admin/services" element={
              <AdminRoute>
                <ServiceManagement />
              </AdminRoute>
            } />
            <Route path="/admin/products" element={
              <AdminRoute>
                <ProductManagement />
              </AdminRoute>
            } />
            <Route path="/comandas" element={
              <ProtectedRoute>
                <Comandas />
              </ProtectedRoute>
            } />
            <Route path="/produtos" element={
              <ProtectedRoute>
                <Produtos />
              </ProtectedRoute>
            } />
            <Route path="/agendamento/sucesso" element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            } />
            <Route path="/agendamento/erro" element={
              <ProtectedRoute>
                <PaymentError />
              </ProtectedRoute>
            } />
            <Route path="/agendamento/pendente" element={
              <ProtectedRoute>
                <PaymentPending />
              </ProtectedRoute>
            } />
            <Route path="/pagamento/pix" element={
              <ProtectedRoute>
                <PixPagamento />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <QueueAutomationProvider>
          <AppContent />
        </QueueAutomationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
