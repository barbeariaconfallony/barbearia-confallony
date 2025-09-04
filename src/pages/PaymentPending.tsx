import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw } from "lucide-react";

const PaymentPending = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [seconds, setSeconds] = useState(30);
  
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          // Check payment status after countdown
          checkPayment();
          return 30; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const checkPayment = async () => {
    // Here you would check the payment status
    // For now, just simulate checking
    console.log('Checking payment status for ID:', paymentId);
    
    // In a real implementation, you would call your payment service
    // and redirect based on the result
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
            </div>
            <CardTitle className="text-2xl text-yellow-600">Pagamento Pendente</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Aguardando confirmação do seu pagamento PIX.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-700">
                Verificando status do pagamento em {seconds} segundos...
              </p>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${((30 - seconds) / 30) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={checkPayment}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Verificar Agora
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/booking')}
                className="w-full"
              >
                Voltar ao Agendamento
              </Button>
            </div>

            <div className="text-xs text-muted-foreground pt-4">
              <p>O pagamento pode levar alguns minutos para ser confirmado.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentPending;