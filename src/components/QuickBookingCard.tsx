import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, MapPin, Repeat, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useQuickBooking } from '@/hooks/useQuickBooking';

interface QuickBookingCardProps {
  userEmail: string | undefined;
}

export const QuickBookingCard: React.FC<QuickBookingCardProps> = ({ userEmail }) => {
  const navigate = useNavigate();
  const { ultimoAgendamento, sugestoesHorarios, loading } = useQuickBooking(userEmail);

  const handleRepetirServico = () => {
    if (!ultimoAgendamento) return;
    
    // Navegar para página de agendamento com dados pré-preenchidos
    navigate('/booking-mobile', {
      state: {
        servicoPreSelecionado: ultimoAgendamento.servico_id,
        funcionarioPreSelecionado: ultimoAgendamento.funcionario_id,
        isQuickBooking: true
      }
    });
  };

  if (loading || !ultimoAgendamento) return null;

  return (
    <div className="space-y-4">
      {/* Card Repetir Último Serviço */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Repeat className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Agendamento Rápido</h3>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{ultimoAgendamento.servico_nome}</p>
                <p className="text-xs text-muted-foreground">
                  Último atendimento: {format(ultimoAgendamento.data, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <Badge variant="default" className="text-xs">
                R$ {ultimoAgendamento.preco.toFixed(2)}
              </Badge>
            </div>

            {ultimoAgendamento.funcionario_nome && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{ultimoAgendamento.funcionario_nome}</span>
              </div>
            )}

            {ultimoAgendamento.sala_atendimento && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{ultimoAgendamento.sala_atendimento}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{ultimoAgendamento.duracao} minutos</span>
            </div>
          </div>

          <Button 
            onClick={handleRepetirServico}
            className="w-full"
            size="sm"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Repetir Este Serviço
          </Button>
        </CardContent>
      </Card>

      {/* Card Sugestões de Horários */}
      {sugestoesHorarios.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-foreground">Horários Recomendados</h3>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              Baseado no seu histórico de agendamentos
            </p>

            <div className="space-y-2">
              {sugestoesHorarios.map((sugestao, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-medium text-foreground capitalize">
                        {sugestao.dia}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sugestao.horario}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {sugestao.frequencia}x
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
