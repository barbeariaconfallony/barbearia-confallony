import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, CreditCard, Banknote, Calendar, User, Clock, Receipt, Ruler } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Appointment {
  id: string;
  servico_nome: string;
  funcionario_nome?: string;
  data_conclusao?: Date;
  forma_pagamento: string;
  preco: number;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  observacoes?: string;
  usuario_nome?: string;
  usuario_email?: string;
  alturas_corte?: {
    lateral_esquerda?: number;
    lateral_direita?: number;
    nuca?: number;
    topo?: number;
    frente?: number;
    barba?: number;
    observacao_extra?: string;
  };
}

interface AgendamentoDetalhado extends Appointment {
  totalAgendamentosUsuario?: number;
}

interface UltimosAgendamentosProps {
  userEmail: string;
  maxItems?: number;
  compact?: boolean;
}

export const UltimosAgendamentos = ({ userEmail, maxItems = 3, compact = false }: UltimosAgendamentosProps) => {
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoDetalhado | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadAgendamentoDetails = async (agendamento: Appointment) => {
    setLoadingDetails(true);
    try {
      const detalhado: AgendamentoDetalhado = {
        ...agendamento,
        // Garantir que as datas estão válidas
        data_conclusao: agendamento.data_conclusao && !isNaN(agendamento.data_conclusao.getTime()) 
          ? agendamento.data_conclusao 
          : new Date(),
        tempo_inicio: agendamento.tempo_inicio && !isNaN(agendamento.tempo_inicio.getTime())
          ? agendamento.tempo_inicio
          : undefined,
        tempo_fim: agendamento.tempo_fim && !isNaN(agendamento.tempo_fim.getTime())
          ? agendamento.tempo_fim
          : undefined
      };

      setSelectedAgendamento(detalhado);
      setModalOpen(true);
    } catch (error) {
      console.error("Erro ao carregar detalhes do agendamento:", error);
    }
    setLoadingDetails(false);
  };

  const handleAgendamentoClick = (agendamento: Appointment) => {
    loadAgendamentoDetails(agendamento);
  };

  // Função auxiliar para converter timestamp do Firestore em Date válido
  const toValidDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    
    // Se já é uma Date válida
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    
    // Se é um Timestamp do Firestore
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      try {
        const date = timestamp.toDate();
        return isNaN(date.getTime()) ? new Date() : date;
      } catch {
        return new Date();
      }
    }
    
    // Se é um número (timestamp em ms)
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Se é uma string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    return new Date();
  };

  useEffect(() => {
    const loadAgendamentos = async () => {
      if (!userEmail) {
        console.log("UltimosAgendamentos: Email não fornecido");
        setAgendamentos([]);
        setLoading(false);
        return;
      }

      console.log("UltimosAgendamentos: Buscando agendamentos para:", userEmail);
      setLoading(true);
      try {
        // Buscar agendamentos concluídos do usuário (seguindo o mesmo padrão do UserDetailsModal)
        const concluidosQuery = query(
          collection(db, 'agendamentos_finalizados'),
          where('usuario_email', '==', userEmail)
        );
        
        console.log("UltimosAgendamentos: Executando query...");
        const concluidosSnapshot = await getDocs(concluidosQuery);
        console.log("UltimosAgendamentos: Documentos encontrados:", concluidosSnapshot.docs.length);
        
        const agendamentosConcluidos = concluidosSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("UltimosAgendamentos: Documento:", doc.id, data);
          return {
            id: doc.id,
            ...data,
            data_conclusao: toValidDate(data.data_conclusao || data.tempo_fim),
            tempo_inicio: data.tempo_inicio ? toValidDate(data.tempo_inicio) : undefined,
            tempo_fim: data.tempo_fim ? toValidDate(data.tempo_fim) : undefined
          };
        }) as Appointment[];

        // Ordenar por data e limitar
        const agendamentosOrdenados = agendamentosConcluidos
          .sort((a, b) => (b.data_conclusao?.getTime() || 0) - (a.data_conclusao?.getTime() || 0))
          .slice(0, maxItems);

        console.log("UltimosAgendamentos: Agendamentos ordenados:", agendamentosOrdenados);
        setAgendamentos(agendamentosOrdenados);
      } catch (error) {
        console.error("UltimosAgendamentos: Erro ao carregar agendamentos:", error);
        setAgendamentos([]);
      }
      setLoading(false);
    };

    loadAgendamentos();
  }, [userEmail, maxItems]);

  const getPaymentIcon = (formaPagamento: string) => {
    const pagamento = formaPagamento?.toLowerCase() || '';
    if (pagamento.includes('pix')) {
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    } else if (pagamento.includes('dinheiro')) {
      return <Banknote className="h-4 w-4 text-green-600" />;
    }
    return <CreditCard className="h-4 w-4 text-gray-600" />;
  };

  if (compact) {
    return (
      <>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Últimos Agendamentos
          </h4>
          <div className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded text-xs text-muted-foreground">
                <span>Carregando...</span>
              </div>
            ) : agendamentos.length === 0 ? (
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded text-xs text-muted-foreground">
                <span>Nenhum agendamento anterior encontrado</span>
              </div>
            ) : (
              agendamentos.map((agendamento, index) => (
                <div 
                  key={index} 
                  className="p-2 bg-muted/20 rounded text-xs space-y-1 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleAgendamentoClick(agendamento)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{agendamento.servico_nome}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {format(agendamento.data_conclusao || new Date(), 'dd/MM')}
                      </span>
                      {getPaymentIcon(agendamento.forma_pagamento)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal de Detalhes do Agendamento */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                Detalhes do Agendamento
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <span className="text-sm text-muted-foreground">Carregando detalhes...</span>
                </div>
              </div>
            ) : selectedAgendamento && (
              <div className="space-y-6 pt-2">
                {/* Informações do Serviço */}
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background/80">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{selectedAgendamento.servico_nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedAgendamento.data_conclusao || new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedAgendamento.data_conclusao || new Date(), "'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {/* Funcionário */}
                  {selectedAgendamento.funcionario_nome && (
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                      <div className="p-2 rounded-lg bg-background">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Profissional</p>
                        <p className="font-semibold">{selectedAgendamento.funcionario_nome}</p>
                      </div>
                    </div>
                  )}

                  {/* Tempo de Atendimento */}
                  {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                      <div className="p-2 rounded-lg bg-background">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Duração</p>
                        <p className="font-semibold">
                          {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                {selectedAgendamento.observacoes && (
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Observações do Atendimento</p>
                    <p className="text-sm leading-relaxed">{selectedAgendamento.observacoes}</p>
                  </div>
                )}

                {/* Alturas do Corte */}
                {selectedAgendamento.alturas_corte && Object.keys(selectedAgendamento.alturas_corte).some(key => 
                  key !== 'observacao_extra' && selectedAgendamento.alturas_corte![key as keyof typeof selectedAgendamento.alturas_corte] !== undefined
                ) && (
                  <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-background">
                        <Ruler className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Numerações do Corte</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedAgendamento.alturas_corte.lateral_esquerda !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Lateral Esq.</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.lateral_esquerda}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.lateral_direita !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Lateral Dir.</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.lateral_direita}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.nuca !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Nuca</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.nuca}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.topo !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Topo</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.topo}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.frente !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Frente</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.frente}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.barba !== undefined && (
                        <div className="bg-background p-3 rounded-lg border text-center">
                          <span className="text-xs text-muted-foreground block mb-1">Barba</span>
                          <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.barba}</span>
                          <span className="text-xs text-muted-foreground">mm</span>
                        </div>
                      )}
                    </div>
                    {selectedAgendamento.alturas_corte.observacao_extra && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedAgendamento.alturas_corte.observacao_extra}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Valor e Pagamento */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-background">
                      {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Pagamento</p>
                      <p className="font-semibold">{selectedAgendamento.forma_pagamento}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Total</p>
                    <p className="font-bold text-2xl text-primary">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Últimos Agendamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : agendamentos.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento concluído</p>
          ) : (
            <div className="space-y-2">
              {agendamentos.map((appointment, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => handleAgendamentoClick(appointment)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{appointment.servico_nome}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {format(appointment.data_conclusao || new Date(), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    {getPaymentIcon(appointment.forma_pagamento)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Agendamento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <span className="text-sm text-muted-foreground">Carregando detalhes...</span>
              </div>
            </div>
          ) : selectedAgendamento && (
            <div className="space-y-6 pt-2">
              {/* Informações do Serviço */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Serviço Realizado</p>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-background/80">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{selectedAgendamento.servico_nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedAgendamento.data_conclusao || new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedAgendamento.data_conclusao || new Date(), "'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                {/* Funcionário */}
                {selectedAgendamento.funcionario_nome && (
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="p-2 rounded-lg bg-background">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Profissional</p>
                      <p className="font-semibold">{selectedAgendamento.funcionario_nome}</p>
                    </div>
                  </div>
                )}

                {/* Tempo de Atendimento */}
                {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                    <div className="p-2 rounded-lg bg-background">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Duração</p>
                      <p className="font-semibold">
                        {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Observações */}
              {selectedAgendamento.observacoes && (
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Observações do Atendimento</p>
                  <p className="text-sm leading-relaxed">{selectedAgendamento.observacoes}</p>
                </div>
              )}

              {/* Alturas do Corte */}
              {selectedAgendamento.alturas_corte && Object.keys(selectedAgendamento.alturas_corte).some(key => 
                key !== 'observacao_extra' && selectedAgendamento.alturas_corte![key as keyof typeof selectedAgendamento.alturas_corte] !== undefined
              ) && (
                <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-background">
                      <Ruler className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Numerações do Corte</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedAgendamento.alturas_corte.lateral_esquerda !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Lateral Esq.</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.lateral_esquerda}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                    {selectedAgendamento.alturas_corte.lateral_direita !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Lateral Dir.</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.lateral_direita}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                    {selectedAgendamento.alturas_corte.nuca !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Nuca</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.nuca}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                    {selectedAgendamento.alturas_corte.topo !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Topo</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.topo}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                    {selectedAgendamento.alturas_corte.frente !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Frente</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.frente}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                    {selectedAgendamento.alturas_corte.barba !== undefined && (
                      <div className="bg-background p-3 rounded-lg border text-center">
                        <span className="text-xs text-muted-foreground block mb-1">Barba</span>
                        <span className="font-bold text-lg">{selectedAgendamento.alturas_corte.barba}</span>
                        <span className="text-xs text-muted-foreground">mm</span>
                      </div>
                    )}
                  </div>
                    {selectedAgendamento.alturas_corte.observacao_extra && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Detalhes do Serviço</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {selectedAgendamento.alturas_corte.observacao_extra}
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Valor e Pagamento */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Pagamento</p>
                    <p className="font-semibold">{selectedAgendamento.forma_pagamento}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Total</p>
                  <p className="font-bold text-2xl text-primary">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};