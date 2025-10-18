import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Award, TrendingUp, Calendar, Gift, Heart } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HistoricoClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
}

interface ClienteFidelidade {
  pontos_disponiveis: number;
  nivel: string;
  total_gasto: number;
  visitas_total: number;
  bebida_favorita?: string;
  data_aniversario?: Date;
}

interface HistoricoConsumo {
  comanda_numero: string;
  total: number;
  tipo_pagamento: string;
  data_consumo: Date;
  itens: any[];
}

export const HistoricoClienteModal: React.FC<HistoricoClienteModalProps> = ({
  open,
  onOpenChange,
  clienteId,
  clienteNome
}) => {
  const [fidelidade, setFidelidade] = useState<ClienteFidelidade | null>(null);
  const [historico, setHistorico] = useState<HistoricoConsumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && clienteId) {
      loadClienteData();
    }
  }, [open, clienteId]);

  const loadClienteData = async () => {
    setLoading(true);
    try {
      // Carregar dados de fidelidade
      const fidelidadeQuery = query(
        collection(db, 'cliente_fidelidade'),
        where('cliente_id', '==', clienteId)
      );
      const fidelidadeSnapshot = await getDocs(fidelidadeQuery);
      
      if (!fidelidadeSnapshot.empty) {
        const fidelidadeData = fidelidadeSnapshot.docs[0].data();
        setFidelidade({
          pontos_disponiveis: fidelidadeData.pontos_disponiveis || 0,
          nivel: fidelidadeData.nivel || 'bronze',
          total_gasto: fidelidadeData.total_gasto || 0,
          visitas_total: fidelidadeData.visitas_total || 0,
          bebida_favorita: fidelidadeData.bebida_favorita,
          data_aniversario: fidelidadeData.data_aniversario?.toDate()
        });
      }

      // Carregar histórico de consumo (últimas 10 comandas)
      const historicoQuery = query(
        collection(db, 'historico_consumo'),
        where('cliente_id', '==', clienteId),
        orderBy('data_consumo', 'desc'),
        limit(10)
      );
      const historicoSnapshot = await getDocs(historicoQuery);
      
      const historicoData = historicoSnapshot.docs.map(doc => ({
        comanda_numero: doc.data().comanda_numero,
        total: doc.data().total,
        tipo_pagamento: doc.data().tipo_pagamento,
        data_consumo: doc.data().data_consumo.toDate(),
        itens: doc.data().itens
      }));
      
      setHistorico(historicoData);
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'bronze': return 'bg-amber-700';
      case 'prata': return 'bg-gray-400';
      case 'ouro': return 'bg-yellow-500';
      case 'platina': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const isAniversariante = () => {
    if (!fidelidade?.data_aniversario) return false;
    const hoje = new Date();
    const aniversario = fidelidade.data_aniversario;
    return hoje.getMonth() === aniversario.getMonth();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] animate-fade-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil do Cliente
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Informações do Cliente */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{clienteNome}</h3>
                      {fidelidade && (
                        <Badge className={`mt-2 ${getNivelColor(fidelidade.nivel)} text-white`}>
                          {fidelidade.nivel.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {isAniversariante() && (
                      <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2 animate-pulse">
                        <Gift className="h-4 w-4 text-pink-500" />
                        <span className="text-sm font-medium text-pink-600">Aniversariante</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas do Programa de Fidelidade */}
              {fidelidade && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="animate-fade-in">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Pontos</p>
                          <p className="text-2xl font-bold">{fidelidade.pontos_disponiveis}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Gasto</p>
                          <p className="text-2xl font-bold">R$ {fidelidade.total_gasto.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Visitas</p>
                          <p className="text-2xl font-bold">{fidelidade.visitas_total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {fidelidade.bebida_favorita && (
                    <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Heart className="h-8 w-8 text-red-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Favorito</p>
                            <p className="text-lg font-bold line-clamp-1">{fidelidade.bebida_favorita}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Histórico de Consumo */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Últimos Consumos
                </h3>
                
                {historico.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      Nenhum histórico de consumo encontrado
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {historico.map((item, index) => (
                      <Card key={index} className="hover:bg-muted/50 transition-colors duration-200">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">Comanda #{item.comanda_numero}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.data_consumo.toLocaleDateString('pt-BR')} às{' '}
                                {item.data_consumo.toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                R$ {item.total.toFixed(2)}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.tipo_pagamento}
                              </Badge>
                            </div>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="space-y-1">
                            {item.itens.map((produto: any, idx: number) => (
                              <p key={idx} className="text-sm text-muted-foreground">
                                {produto.quantidade}x {produto.produto_nome} - R$ {produto.total.toFixed(2)}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
