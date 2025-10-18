import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, CreditCard, Banknote, Calendar, User, Clock, Receipt, Ruler, Filter } from "lucide-react";
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
  const [filtroServico, setFiltroServico] = useState<string>("todos");

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

  // Obter lista de serviços únicos
  const servicosUnicos = useMemo(() => {
    const servicos = agendamentos.map(a => a.servico_nome);
    return Array.from(new Set(servicos)).sort();
  }, [agendamentos]);

  // Filtrar agendamentos
  const agendamentosFiltrados = useMemo(() => {
    if (filtroServico === "todos") {
      return agendamentos;
    }
    return agendamentos.filter(a => a.servico_nome === filtroServico);
  }, [agendamentos, filtroServico]);

  if (compact) {
    return (
      <>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Últimos Agendamentos
          </h4>
          
          {/* Filtro de Serviço */}
          {servicosUnicos.length > 0 && (
            <Select value={filtroServico} onValueChange={setFiltroServico}>
              <SelectTrigger className="w-full h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Filtrar por serviço" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos" className="text-xs">Todos os serviços</SelectItem>
                {servicosUnicos.map((servico) => (
                  <SelectItem key={servico} value={servico} className="text-xs">
                    {servico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded text-xs text-muted-foreground">
                <span>Carregando...</span>
              </div>
            ) : agendamentosFiltrados.length === 0 ? (
              <div className="flex items-center justify-center p-4 bg-muted/20 rounded text-xs text-muted-foreground">
                <span>Nenhum agendamento encontrado</span>
              </div>
            ) : (
              agendamentosFiltrados.map((agendamento, index) => (
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
          <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
            <DialogHeader className="border-b pb-4 relative">
              <div className="absolute -top-2 -right-2 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <DialogTitle className="flex items-center justify-between text-2xl">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                    <Receipt className="h-6 w-6 text-primary" />
                  </div>
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Detalhes do Serviço
                  </span>
                </div>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Concluído
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetails ? (
              <div className="flex items-center justify-center p-16">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                    <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse"></div>
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Carregando detalhes...</span>
                </div>
              </div>
            ) : selectedAgendamento && (
              <div className="space-y-5 pt-3">
                {/* Hero Card - Informações Principais */}
                <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 rounded-2xl p-6 text-white shadow-xl border border-primary/30">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-5 w-5 text-white/90" />
                          <span className="text-xs uppercase tracking-wider text-white/80 font-semibold">Serviço Realizado</span>
                        </div>
                        <h3 className="font-bold text-2xl mb-2">{selectedAgendamento.servico_nome}</h3>
                        <p className="text-sm text-white/90 capitalize">
                          {format(selectedAgendamento.data_conclusao || new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-white/80">
                          {format(selectedAgendamento.data_conclusao || new Date(), "'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <p className="text-xs text-white/80 uppercase tracking-wider font-medium mb-1">Valor Total</p>
                        <p className="font-bold text-3xl">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Tempo de Duração destacado */}
                    {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (() => {
                      const duracao = Math.round((selectedAgendamento.tempo_fim.getTime() - selectedAgendamento.tempo_inicio.getTime()) / 60000);
                      return (
                        <div className="flex items-center gap-4 pt-3 border-t border-white/20">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-white/80" />
                            <span className="text-sm text-white/90">
                              {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                            </span>
                          </div>
                          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/25">
                            {duracao} minutos de atendimento
                          </Badge>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Grid de Informações Importantes */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Profissional */}
                  {selectedAgendamento.funcionario_nome && (
                    <div className="group relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                      <div className="relative flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Atendido por</p>
                          <p className="font-bold text-lg text-foreground">{selectedAgendamento.funcionario_nome}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forma de Pagamento */}
                  <div className="group relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                    <div className="relative flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform">
                        {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Pagamento</p>
                        <p className="font-bold text-lg text-foreground">{selectedAgendamento.forma_pagamento}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                {selectedAgendamento.observacoes && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-xl p-5 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Observações do Atendimento</p>
                        <p className="text-sm leading-relaxed text-foreground">{selectedAgendamento.observacoes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Alturas do Corte - Design Premium */}
                {selectedAgendamento.alturas_corte && Object.keys(selectedAgendamento.alturas_corte).some(key => 
                  key !== 'observacao_extra' && selectedAgendamento.alturas_corte![key as keyof typeof selectedAgendamento.alturas_corte] !== undefined
                ) && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/10 rounded-xl p-6 border border-purple-500/20 shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                          <Ruler className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Especificações do Corte</p>
                          <p className="text-sm text-muted-foreground">Suas preferências salvas</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedAgendamento.alturas_corte.lateral_esquerda !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Lateral Esquerda</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.lateral_esquerda}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                        {selectedAgendamento.alturas_corte.lateral_direita !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Lateral Direita</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.lateral_direita}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                        {selectedAgendamento.alturas_corte.nuca !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Nuca</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.nuca}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                        {selectedAgendamento.alturas_corte.topo !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Topo</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.topo}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                        {selectedAgendamento.alturas_corte.frente !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Frente</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.frente}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                        {selectedAgendamento.alturas_corte.barba !== undefined && (
                          <div className="group relative bg-background/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2 font-semibold">Barba</span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="font-black text-3xl text-purple-600">{selectedAgendamento.alturas_corte.barba}</span>
                              <span className="text-xs text-muted-foreground font-medium">mm</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedAgendamento.alturas_corte.observacao_extra && (
                        <div className="pt-3 border-t border-purple-500/20">
                          <p className="text-sm text-muted-foreground leading-relaxed italic">
                            💡 {selectedAgendamento.alturas_corte.observacao_extra}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer com informações adicionais */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 rounded-xl border border-primary/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Atendimento concluído com sucesso</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ID: {selectedAgendamento.id.substring(0, 8)}
                  </Badge>
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
        <CardHeader className="space-y-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Últimos Agendamentos
          </CardTitle>
          
          {/* Filtro de Serviço */}
          {servicosUnicos.length > 0 && (
            <Select value={filtroServico} onValueChange={setFiltroServico}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por serviço" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="todos">Todos os serviços</SelectItem>
                {servicosUnicos.map((servico) => (
                  <SelectItem key={servico} value={servico}>
                    {servico}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : agendamentosFiltrados.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado</p>
          ) : (
            <div className="space-y-2">
              {agendamentosFiltrados.map((appointment, index) => (
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
        <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
          <DialogHeader className="border-b pb-3 md:pb-4 relative">
            <div className="absolute -top-2 -right-2 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xl md:text-2xl">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
                  <Receipt className="h-6 w-6 text-primary" />
                </div>
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Detalhes do Serviço
                </span>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Concluído
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="flex items-center justify-center p-16">
              <div className="text-center space-y-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse"></div>
                </div>
                <span className="text-sm text-muted-foreground font-medium">Carregando detalhes...</span>
              </div>
            </div>
          ) : selectedAgendamento && (
            <div className="space-y-5 pt-3">
              {/* Hero Card - Informações Principais */}
              <div className="relative overflow-hidden bg-muted/30 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xl border">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="relative space-y-3 md:space-y-4">
                  {/* Serviço e Data */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 md:h-5 w-4 md:w-5 text-primary" />
                      <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground font-semibold">Serviço Realizado</span>
                    </div>
                    <h3 className="font-bold text-lg md:text-2xl mb-2">{selectedAgendamento.servico_nome}</h3>
                    <p className="text-xs md:text-sm text-foreground capitalize">
                      {format(selectedAgendamento.data_conclusao || new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {format(selectedAgendamento.data_conclusao || new Date(), "'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  
                  {/* Valor Total */}
                  <div className="bg-primary/10 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 border border-primary/20">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Valor Total</p>
                    <p className="font-bold text-2xl md:text-3xl text-primary">R$ {selectedAgendamento.preco.toFixed(2)}</p>
                  </div>

                  {/* Tempo de Duração destacado */}
                  {selectedAgendamento.tempo_inicio && selectedAgendamento.tempo_fim && (() => {
                    const duracao = Math.round((selectedAgendamento.tempo_fim.getTime() - selectedAgendamento.tempo_inicio.getTime()) / 60000);
                    return (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 md:h-4 w-3 md:w-4 text-muted-foreground" />
                          <span className="text-xs md:text-sm text-foreground">
                            {format(selectedAgendamento.tempo_inicio, "HH:mm")} - {format(selectedAgendamento.tempo_fim, "HH:mm")}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] md:text-xs">
                          {duracao} minutos de atendimento
                        </Badge>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Grid de Informações Importantes */}
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {/* Profissional */}
                {selectedAgendamento.funcionario_nome && (
                  <div className="group relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg md:rounded-xl p-4 md:p-5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                    <div className="relative flex items-center gap-3 md:gap-4">
                      <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-primary/10 border border-primary/20 group-hover:scale-110 transition-transform">
                        <User className="h-5 md:h-6 w-5 md:w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5 md:mb-1">Atendido por</p>
                        <p className="font-bold text-base md:text-lg text-foreground">{selectedAgendamento.funcionario_nome}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Forma de Pagamento */}
                <div className="group relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg md:rounded-xl p-4 md:p-5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />
                  <div className="relative flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-green-500/10 border border-green-500/20 group-hover:scale-110 transition-transform">
                      {getPaymentIcon(selectedAgendamento.forma_pagamento)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5 md:mb-1">Pagamento</p>
                      <p className="font-bold text-base md:text-lg text-foreground">{selectedAgendamento.forma_pagamento}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedAgendamento.observacoes && (
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-lg md:rounded-xl p-4 md:p-5 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Receipt className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Observações do Atendimento</p>
                      <p className="text-sm leading-relaxed text-foreground">{selectedAgendamento.observacoes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Alturas do Corte - Design Premium */}
              {selectedAgendamento.alturas_corte && Object.keys(selectedAgendamento.alturas_corte).some(key => 
                key !== 'observacao_extra' && selectedAgendamento.alturas_corte![key as keyof typeof selectedAgendamento.alturas_corte] !== undefined
              ) && (
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-purple-500/10 rounded-lg md:rounded-xl p-4 md:p-6 border border-purple-500/20 shadow-lg">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                  <div className="relative space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                        <Ruler className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Especificações do Corte</p>
                        <p className="text-sm text-muted-foreground">Suas preferências salvas</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedAgendamento.alturas_corte.lateral_esquerda !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Lateral Esquerda</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.lateral_esquerda}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.lateral_direita !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Lateral Direita</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.lateral_direita}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.nuca !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Nuca</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.nuca}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.topo !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Topo</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.topo}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.frente !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Frente</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.frente}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                      {selectedAgendamento.alturas_corte.barba !== undefined && (
                        <div className="group relative bg-background/80 backdrop-blur-sm p-3 md:p-4 rounded-lg md:rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all hover:shadow-md text-center">
                          <span className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider block mb-1 md:mb-2 font-semibold">Barba</span>
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="font-black text-2xl md:text-3xl text-purple-600">{selectedAgendamento.alturas_corte.barba}</span>
                            <span className="text-xs text-muted-foreground font-medium">mm</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedAgendamento.alturas_corte.observacao_extra && (
                      <div className="pt-3 border-t border-purple-500/20">
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          💡 {selectedAgendamento.alturas_corte.observacao_extra}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer com informações adicionais */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 p-3 md:p-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 rounded-lg md:rounded-xl border border-primary/10">
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <CheckCircle className="h-3 md:h-4 w-3 md:w-4 text-green-600" />
                  <span>Atendimento concluído com sucesso</span>
                </div>
                <Badge variant="outline" className="text-[10px] md:text-xs">
                  ID: {selectedAgendamento.id.substring(0, 8)}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};