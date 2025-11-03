import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, CreditCard, QrCode, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useServices } from '@/hooks/useServices';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ServiceBookingProps {
  onPixPayment: (bookingData: BookingData) => void;
  onCashPayment?: (bookingData: BookingData) => void;
}

export interface BookingData {
  service: string;
  serviceId: string;
  date: string;
  time: string;
  amount: number;
  sala_atendimento: string;
}

const timeSlots = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
];

export const ServiceBooking: React.FC<ServiceBookingProps> = ({ onPixPayment, onCashPayment }) => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const { toast } = useToast();
  const { services, loading } = useServices();

  const selectedServiceData = services.find(s => s.id === selectedService);

  const handlePixPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos antes de prosseguir.",
        variant: "destructive"
      });
      return;
    }

    const bookingData: BookingData = {
      service: selectedServiceData?.nome || '',
      serviceId: selectedService,
      date: selectedDate,
      time: selectedTime,
      amount: selectedServiceData?.preco || 0,
      sala_atendimento: selectedServiceData?.sala_atendimento || ''
    };

    onPixPayment(bookingData);
  };

  const handleCashPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos antes de prosseguir.",
        variant: "destructive"
      });
      return;
    }

    const bookingData: BookingData = {
      service: selectedServiceData?.nome || '',
      serviceId: selectedService,
      date: selectedDate,
      time: selectedTime,
      amount: selectedServiceData?.preco || 0,
      sala_atendimento: selectedServiceData?.sala_atendimento || ''
    };

    // Salvar diretamente na coleção fila quando pagamento em dinheiro
    try {
      const appointmentDate = new Date(selectedDate + 'T' + selectedTime);
      
      const appointmentData = {
        servico_id: selectedService,
        servico_nome: selectedServiceData?.nome || '',
        sala_atendimento: selectedServiceData?.sala_atendimento || '',
        data: appointmentDate,
        tempo_inicio: appointmentDate,
        duracao: selectedServiceData?.duracao || 30,
        preco: selectedServiceData?.preco || 0,
        status: 'confirmado',
        metodo_pagamento: 'Dinheiro',
        data_criacao: new Date(),
        observacoes: 'Pagamento em dinheiro - confirmado automaticamente',
        presente: true
      };

      const docRef = await addDoc(collection(db, 'fila'), appointmentData);
      
      toast({
        title: "Agendamento confirmado!",
        description: "Seu agendamento foi salvo com sucesso. Pagamento será realizado na barbearia.",
      });

      if (onCashPayment) {
        onCashPayment(bookingData);
      }
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card bg-gradient-card">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Agendamento de Serviços
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Selecione o serviço desejado e escolha o melhor horário para você
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tipo de Serviço</label>
          <Select value={selectedService} onValueChange={setSelectedService} disabled={loading}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading ? "Carregando serviços..." : "Selecione um serviço"} />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{service.nome}</span>
                      {service.sala_atendimento && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {service.sala_atendimento}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-primary ml-4">
                      R$ {service.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getTomorrowDate()}
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Horário</label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um horário" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedServiceData && (
          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">Resumo do Agendamento</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Serviço:</strong> {selectedServiceData.nome}</p>
              {selectedServiceData.sala_atendimento && (
                <p className="flex items-center gap-1">
                  <strong>Sala:</strong>
                  <MapPin className="w-3 h-3" />
                  {selectedServiceData.sala_atendimento}
                </p>
              )}
              {selectedDate && <p><strong>Data:</strong> {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}</p>}
              {selectedTime && <p><strong>Horário:</strong> {selectedTime}</p>}
              <p><strong>Duração:</strong> {selectedServiceData.duracao} minutos</p>
              <p className="text-lg font-bold text-primary">
                <strong>Valor:</strong> R$ {selectedServiceData.preco.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={handlePixPayment}
            className="w-full"
            variant="pix"
            size="lg"
            disabled={!selectedService || !selectedDate || !selectedTime || loading}
          >
            <QrCode className="w-5 h-5" />
            Pagar com Pix
          </Button>
          
          <Button 
            onClick={handleCashPayment}
            className="w-full"
            variant="outline"
            size="lg"
            disabled={!selectedService || !selectedDate || !selectedTime || loading}
          >
            <CreditCard className="w-5 h-5" />
            Pagar na Barbearia
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>🔒 Pagamento 100% seguro via Mercado Pago</p>
          <p>Confirmação instantânea após o pagamento</p>
        </div>
      </CardContent>
    </Card>
  );
};