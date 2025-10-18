import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Download } from 'lucide-react';
import { downloadICalFile, addToGoogleCalendar } from '@/utils/calendar-export';
import { useToast } from '@/hooks/use-toast';

interface AddToCalendarButtonProps {
  agendamento: {
    id: string;
    servico_nome: string;
    data: Date;
    duracao?: number;
    funcionario_nome?: string;
    sala_atendimento?: string;
  };
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({
  agendamento,
  variant = 'outline',
  size = 'sm',
  className = ''
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const agendamentoData = {
    id: agendamento.id,
    servico_nome: agendamento.servico_nome,
    data: agendamento.data,
    duracao: agendamento.duracao || 30,
    funcionario_nome: agendamento.funcionario_nome,
    sala_atendimento: agendamento.sala_atendimento,
  };

  const handleGoogleCalendar = () => {
    try {
      addToGoogleCalendar(agendamentoData);
      toast({
        title: "Redirecionando...",
        description: "Abrindo Google Calendar em nova aba.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao abrir Google Calendar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir o Google Calendar.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadICal = () => {
    try {
      downloadICalFile(agendamentoData);
      toast({
        title: "Arquivo baixado!",
        description: "Arquivo .ics baixado. Abra-o para adicionar ao seu calendário.",
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo do calendário.",
        variant: "destructive"
      });
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calendar className={size === 'sm' ? 'h-3 w-3 mr-1 flex-shrink-0' : 'h-4 w-4 mr-2 flex-shrink-0'} />
          <span className="truncate">Adicionar ao Calendário</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <Calendar className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICal}>
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo .ics (iCal)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
