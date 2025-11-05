import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wallet, Clock, User, MapPin, AlertCircle } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PagamentoRestanteModalWithReceipt } from "./PagamentoRestanteModalWithReceipt";

interface PagamentoPendente {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  servico_nome: string;
  preco: number;
  valor_pago: number;
  valor_restante: number;
  data: Date;
  tempo_inicio?: Date;
  funcionario_nome?: string;
  sala_atendimento?: string;
  status: string;
}

interface PagamentosPendentesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuarioId: string;
}

export const PagamentosPendentesModal = ({
  open,
  onOpenChange,
  usuarioId
}: PagamentosPendentesModalProps) => {
  const [pagamentosPendentes, setPagamentosPendentes] = useState<PagamentoPendente[]>([]);
  const [pagamentoSelecionado, setPagamentoSelecionado] = useState<PagamentoPendente | null>(null);
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;

    const q = query(
      collection(db, 'fila'),
      where('usuario_id', '==', usuarioId),
      where('pagamento_parcial', '==', true),
      where('status', '==', 'em_atendimento')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendentes: PagamentoPendente[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Verificar se ainda há valor restante a pagar
        const valorRestante = data.valor_parcial_restante ?? data.valor_restante ?? 0;
        if (valorRestante > 0) {
          pendentes.push({
            id: doc.id,
            usuario_id: data.usuario_id,
            usuario_nome: data.usuario_nome,
            servico_nome: data.servico_nome,
            preco: data.valor_total || data.preco || 0,
            valor_pago: data.valor_pago || 0,
            valor_restante: valorRestante,
            data: data.data?.toDate() || new Date(),
            tempo_inicio: data.tempo_inicio?.toDate(),
            funcionario_nome: data.funcionario_nome,
            sala_atendimento: data.sala_atendimento,
            status: data.status
          });
        }
      });

      setPagamentosPendentes(pendentes);
    });

    return () => unsubscribe();
  }, [usuarioId]);

  const handlePagarRestante = (pagamento: PagamentoPendente) => {
    setPagamentoSelecionado(pagamento);
    setModalPagamentoOpen(true);
  };

  const handlePagamentoConcluido = () => {
    setModalPagamentoOpen(false);
    setPagamentoSelecionado(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-amber-600" />
            Pagamentos Pendentes ({pagamentosPendentes.length})
          </DialogTitle>
        </DialogHeader>

        {pagamentosPendentes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pagamento pendente</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {pagamentosPendentes.map((pagamento) => (
              <Card
                key={pagamento.id}
                className="bg-card/50 backdrop-blur border-amber-200 dark:border-amber-800"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-amber-500 text-white">
                            {pagamento.usuario_nome.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {pagamento.servico_nome}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20 text-[10px] px-2 py-1 flex-shrink-0">
                        <Clock className="h-2.5 w-2.5 mr-1" />
                        Em Atendimento
                      </Badge>
                    </div>

                    {/* Informações adicionais */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {pagamento.funcionario_nome && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Profissional: {pagamento.funcionario_nome}</span>
                        </div>
                      )}
                      {pagamento.sala_atendimento && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">Sala: {pagamento.sala_atendimento}</span>
                        </div>
                      )}
                    </div>

                    {/* Valores */}
                    <div className="pt-3 border-t border-amber-200 dark:border-amber-800 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valor Total:</span>
                        <span className="font-medium">R$ {pagamento.preco.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Pago (1/3):</span>
                        <span className="font-medium">R$ {pagamento.valor_pago.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-amber-600">
                        <span>Restante (2/3):</span>
                        <span>R$ {pagamento.valor_restante.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Botão de pagamento */}
                    <Button
                      onClick={() => handlePagarRestante(pagamento)}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      size="sm"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Pagar Restante
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>

      {/* Modal de Pagamento PIX */}
      {pagamentoSelecionado && (
        <PagamentoRestanteModalWithReceipt
          open={modalPagamentoOpen}
          onOpenChange={setModalPagamentoOpen}
          agendamentoId={pagamentoSelecionado.id}
          valorTotal={pagamentoSelecionado.preco}
          valorPago={pagamentoSelecionado.valor_pago}
          valorRestante={pagamentoSelecionado.valor_restante}
          usuarioId={pagamentoSelecionado.usuario_id}
          clienteNome={pagamentoSelecionado.usuario_nome}
          clienteEmail=""
          servicoNome={pagamentoSelecionado.servico_nome}
          onPagamentoConcluido={handlePagamentoConcluido}
        />
      )}
    </Dialog>
  );
};
