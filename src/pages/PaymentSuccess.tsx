import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const appointmentId = searchParams.get('appointmentId');
  const service = searchParams.get('service');
  const date = searchParams.get('date');
  const time = searchParams.get('time');

  useEffect(() => {
    // Auto redirect after 10 seconds
    const timer = setTimeout(() => {
      navigate('/profile');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Pagamento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Seu pagamento foi processado com sucesso e seu agendamento foi confirmado.
            </p>
            
            {service && date && time && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Serviço: {service}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{date} às {time}</span>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Button 
                onClick={() => navigate('/profile')}
                className="w-full"
              >
                Ver Meus Agendamentos
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Você será redirecionado automaticamente em 10 segundos
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;