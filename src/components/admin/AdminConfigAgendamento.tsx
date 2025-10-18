import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const diasSemana = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

const gerarHorarios = () => {
  const horarios: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      horarios.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return horarios;
};

export const AdminConfigAgendamento: React.FC = () => {
  const { toast } = useToast();
  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Seg a Sáb
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const todosHorarios = gerarHorarios();

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'config_agendamento'));

      if (!snapshot.empty) {
        const config = snapshot.docs[0];
        const data = config.data();
        setConfigId(config.id);
        setDiasSelecionados(data.dias_semana || [1, 2, 3, 4, 5, 6]);
        setHorariosSelecionados(data.horarios_disponiveis || []);
      } else {
        // Configuração padrão: 8h às 19h
        const horariosDefault = todosHorarios.filter(h => {
          const [hour] = h.split(':').map(Number);
          return hour >= 8 && hour <= 19;
        });
        setHorariosSelecionados(horariosDefault);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive',
      });
    }
  };

  const handleDiaToggle = (diaId: number) => {
    setDiasSelecionados(prev =>
      prev.includes(diaId)
        ? prev.filter(d => d !== diaId)
        : [...prev, diaId]
    );
  };

  const handleHorarioToggle = (horario: string) => {
    setHorariosSelecionados(prev =>
      prev.includes(horario)
        ? prev.filter(h => h !== horario)
        : [...prev, horario]
    );
  };

  const handleSelecionarTodosHorarios = () => {
    setHorariosSelecionados(todosHorarios);
  };

  const handleDesmarcarTodosHorarios = () => {
    setHorariosSelecionados([]);
  };

  const handleSalvar = async () => {
    if (diasSelecionados.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um dia da semana.',
        variant: 'destructive',
      });
      return;
    }

    if (horariosSelecionados.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um horário.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const configData = {
        dias_semana: diasSelecionados.sort((a, b) => a - b),
        horarios_disponiveis: horariosSelecionados.sort(),
        data_atualizacao: new Date(),
      };

      if (configId) {
        // Atualizar configuração existente
        await updateDoc(doc(db, 'config_agendamento', configId), configData);
      } else {
        // Criar nova configuração
        const docRef = await addDoc(collection(db, 'config_agendamento'), {
          ...configData,
          data_criacao: new Date(),
        });
        setConfigId(docRef.id);
      }

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Dias da Semana */}
              <div>
                <h3 className="font-semibold mb-3">Dias da Semana Disponíveis</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione os dias da semana em que os agendamentos estarão disponíveis
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {diasSemana.map(dia => (
                    <div key={dia.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dia-${dia.id}`}
                        checked={diasSelecionados.includes(dia.id)}
                        onCheckedChange={() => handleDiaToggle(dia.id)}
                      />
                      <Label
                        htmlFor={`dia-${dia.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {dia.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Horários */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Horários Disponíveis</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Selecione os horários em que os agendamentos estarão disponíveis
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelecionarTodosHorarios}
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDesmarcarTodosHorarios}
                    >
                      Desmarcar Todos
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {todosHorarios.map(horario => (
                    <div key={horario} className="flex items-center space-x-2">
                      <Checkbox
                        id={`horario-${horario}`}
                        checked={horariosSelecionados.includes(horario)}
                        onCheckedChange={() => handleHorarioToggle(horario)}
                      />
                      <Label
                        htmlFor={`horario-${horario}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {horario}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <Button onClick={handleSalvar} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
