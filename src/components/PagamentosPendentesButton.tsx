import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, CreditCard } from 'lucide-react';
import { PagamentoRestanteModal } from './PagamentoRestanteModal';

interface PagamentoPendente {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_telefone?: string;
  usuario_cpf?: string;
  servico_nome: string;
  preco: number;
  valor_pago: number;
  valor_parcial_restante: number;
}

export const PagamentosPendentesButton = () => {
  const [pendentes, setPendentes] = useState<PagamentoPendente[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<PagamentoPendente | null>(null);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [blinking, setBlinking] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'fila'),
      where('pagamento_parcial', '==', true),
      where('status', '==', 'em_atendimento')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pagamentosPendentes: PagamentoPendente[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const valorTotal = data.valor_total || data.preco || 0;
        const valorPago = valorTotal / 3; // 1/3 do valor total
        const valorRestante = data.valor_parcial_restante || (valorTotal - valorPago);

        pagamentosPendentes.push({
          id: doc.id,
          usuario_id: data.usuario_id || '',
          usuario_nome: data.usuario_nome || '',
          usuario_email: data.usuario_email || '',
          usuario_telefone: data.usuario_telefone || '',
          usuario_cpf: data.payer_cpf || data.usuario_cpf || '',
          servico_nome: data.servico_nome || '',
          preco: valorTotal,
          valor_pago: valorPago,
          valor_parcial_restante: valorRestante,
        });
      });

      setPendentes(pagamentosPendentes);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pendentes.length === 0) return;

    const interval = setInterval(() => {
      setBlinking((prev) => !prev);
    }, 800);

    return () => clearInterval(interval);
  }, [pendentes.length]);

  const handlePagamentoClick = (pagamento: PagamentoPendente) => {
    setSelectedPagamento(pagamento);
    setShowModal(false);
    setShowPagamentoModal(true);
  };

  const handlePagamentoConcluido = () => {
    setShowPagamentoModal(false);
    setSelectedPagamento(null);
  };

  if (pendentes.length === 0) return null;

  return (
    <>
      {/* Botão piscante no canto inferior esquerdo */}
      <Button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 left-6 z-50 shadow-2xl transition-all"
        size="lg"
        variant="default"
        style={{
          opacity: blinking ? 1 : 0.6,
          transform: blinking ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <AlertCircle className="mr-2 h-5 w-5" />
        Pagamentos Pendentes
        <Badge variant="destructive" className="ml-2">
          {pendentes.length}
        </Badge>
      </Button>

      {/* Modal com lista de pagamentos pendentes */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamentos Parciais Pendentes ({pendentes.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {pendentes.map((pagamento) => (
              <Card
                key={pagamento.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors border-amber-200 dark:border-amber-800"
                onClick={() => handlePagamentoClick(pagamento)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-amber-500 text-white">
                          {pagamento.usuario_nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {pagamento.usuario_nome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pagamento.servico_nome}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pagamento.usuario_email}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-medium">
                            R$ {pagamento.preco.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm text-green-600">
                          <span className="text-muted-foreground">Pago: </span>
                          <span className="font-medium">
                            R$ {pagamento.valor_pago.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-amber-600">
                          <span className="text-muted-foreground">Restante: </span>
                          R$ {pagamento.valor_parcial_restante.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2 border-amber-500 text-amber-600">
                        Clique para pagar
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de pagamento restante */}
      {selectedPagamento && (
        <PagamentoRestanteModal
          open={showPagamentoModal}
          onOpenChange={setShowPagamentoModal}
          pagamentoParcialId={selectedPagamento.id}
          agendamentoId={selectedPagamento.id}
          valorTotal={selectedPagamento.preco}
          valorPago={selectedPagamento.valor_pago}
          valorRestante={selectedPagamento.valor_parcial_restante}
          usuarioId={selectedPagamento.usuario_id}
          clienteData={{
            nome: selectedPagamento.usuario_nome,
            email: selectedPagamento.usuario_email,
            cpf: selectedPagamento.usuario_cpf || '',
          }}
          onPagamentoConcluido={handlePagamentoConcluido}
        />
      )}
    </>
  );
};
