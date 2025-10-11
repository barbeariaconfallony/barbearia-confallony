import { format } from 'date-fns';

interface AgendamentoCalendar {
  id: string;
  servico_nome: string;
  data: Date;
  duracao: number; // em minutos
  funcionario_nome?: string;
  sala_atendimento?: string;
  endereco?: string;
}

/**
 * Gera um arquivo .ics (iCalendar) para adicionar ao calendário
 */
export const generateICalFile = (agendamento: AgendamentoCalendar): string => {
  const startDate = agendamento.data;
  const endDate = new Date(startDate.getTime() + agendamento.duracao * 60000);

  // Formatar datas para formato iCalendar (YYYYMMDDTHHmmss)
  const formatICalDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const location = agendamento.sala_atendimento 
    ? `Sala ${agendamento.sala_atendimento}${agendamento.endereco ? ` - ${agendamento.endereco}` : ''}`
    : agendamento.endereco || '';

  const description = [
    `Serviço: ${agendamento.servico_nome}`,
    agendamento.funcionario_nome ? `Profissional: ${agendamento.funcionario_nome}` : '',
    `Duração: ${agendamento.duracao} minutos`,
  ].filter(Boolean).join('\\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barbearia//Agendamento//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${agendamento.id}@barbearia.com`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(startDate)}`,
    `DTEND:${formatICalDate(endDate)}`,
    `SUMMARY:${agendamento.servico_nome}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'DESCRIPTION:Lembrete: Seu agendamento é em 1 hora',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return icsContent;
};

/**
 * Faz download do arquivo .ics
 */
export const downloadICalFile = (agendamento: AgendamentoCalendar) => {
  const icsContent = generateICalFile(agendamento);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `agendamento-${agendamento.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Gera URL para Google Calendar
 */
export const generateGoogleCalendarUrl = (agendamento: AgendamentoCalendar): string => {
  const startDate = agendamento.data;
  const endDate = new Date(startDate.getTime() + agendamento.duracao * 60000);

  const formatGoogleDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const location = agendamento.sala_atendimento 
    ? `Sala ${agendamento.sala_atendimento}${agendamento.endereco ? ` - ${agendamento.endereco}` : ''}`
    : agendamento.endereco || '';

  const description = [
    `Serviço: ${agendamento.servico_nome}`,
    agendamento.funcionario_nome ? `Profissional: ${agendamento.funcionario_nome}` : '',
    `Duração: ${agendamento.duracao} minutos`,
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: agendamento.servico_nome,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: description,
    location: location,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

/**
 * Abre URL do Google Calendar em nova aba
 */
export const addToGoogleCalendar = (agendamento: AgendamentoCalendar) => {
  const url = generateGoogleCalendarUrl(agendamento);
  window.open(url, '_blank', 'noopener,noreferrer');
};
