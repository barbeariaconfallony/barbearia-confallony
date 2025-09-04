import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, CreditCard, Banknote, Calendar, User, Clock, Receipt } from "lucide-react";
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
      // Buscar total de agendamentos do usuário
      const totalQuery = query(
        collection(db, 'agendamentos_finalizados'),
        where('usuario_email', '==', agendamento.usuario_email || userEmail)
      );
      const totalSnapshot = await getDocs(totalQuery);
      const totalAgendamentos = totalSnapshot.docs.length;

      const detalhado: AgendamentoDetalhado = {
        ...agendamento,
        totalAgendamentosUsuario: totalAgendamentos
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
            data_conclusao: data.data_conclusao?.toDate() || data.tempo_fim?.toDate() || new Date()
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Detalhes do Agendamento
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center p-8">
                <span>Carregando detalhes...</span>
              </div>
            ) : selectedAgendamento && (
              <div className="space-y-4">
                {/* Informações do Serviço */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{selectedAgendamento.servico_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(selectedAgendamento.data_conclusao || new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {/* Funcionário */}
                  {selectedAgendamento.funcionario_nome && (
                    <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Atendido por</p>
                        <p className="font-medium">{selectedAgendamento.funcionario_nome}</p>
                      </div>
                    </div>
                  )}

                  {/* Tempo de Atendimento */}
                  {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (
                    <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duração do Atendimento</p>
                        <p className="font-medium">
                          {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  {selectedAgendamento.observacoes && (
                    <div className="p-3 bg-muted/20 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Observações do Atendente</p>
                      <p className="text-sm">{selectedAgendamento.observacoes}</p>
                    </div>
                  )}

                  {/* Valor e Pagamento */}
                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                      <div>
                        <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                        <p className="font-medium">{selectedAgendamento.forma_pagamento}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-bold text-lg">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Estatística do Cliente */}
                  {selectedAgendamento.totalAgendamentosUsuario && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                          <p className="font-medium">
                            {selectedAgendamento.totalAgendamentosUsuario} serviços realizados
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center p-8">
              <span>Carregando detalhes...</span>
            </div>
          ) : selectedAgendamento && (
            <div className="space-y-4">
              {/* Informações do Serviço */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{selectedAgendamento.servico_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(selectedAgendamento.data_conclusao || new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Funcionário */}
                {selectedAgendamento.funcionario_nome && (
                  <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Atendido por</p>
                      <p className="font-medium">{selectedAgendamento.funcionario_nome}</p>
                    </div>
                  </div>
                )}

                {/* Tempo de Atendimento */}
                {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (
                  <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duração do Atendimento</p>
                      <p className="font-medium">
                        {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {selectedAgendamento.observacoes && (
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Observações do Atendente</p>
                    <p className="text-sm">{selectedAgendamento.observacoes}</p>
                  </div>
                )}

                {/* Valor e Pagamento */}
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                    <div>
                      <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                      <p className="font-medium">{selectedAgendamento.forma_pagamento}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-bold text-lg">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                  </div>
                </div>

                {/* Estatística do Cliente */}
                {selectedAgendamento.totalAgendamentosUsuario && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                        <p className="font-medium">
                          {selectedAgendamento.totalAgendamentosUsuario} serviços realizados
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};