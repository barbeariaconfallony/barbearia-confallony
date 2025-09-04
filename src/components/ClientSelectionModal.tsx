import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { User, UserPlus } from 'lucide-react';
import { ClientDropdownSelector } from './ClientDropdownSelector';

interface ClienteData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

interface ClientSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientSelected: (clienteData: ClienteData) => void;
}

export const ClientSelectionModal: React.FC<ClientSelectionModalProps> = ({
  isOpen,
  onClose,
  onClientSelected
}) => {
  const [tipoSelecao, setTipoSelecao] = useState<'cadastrado' | 'novo'>('cadastrado');
  const [selectedClientData, setSelectedClientData] = useState<ClienteData | null>(null);
  const [novoClienteData, setNovoClienteData] = useState<ClienteData>({
    nome: '',
    email: '',
    telefone: '',
    cpf: ''
  });

  const handleConfirm = () => {
    if (tipoSelecao === 'cadastrado') {
      if (!selectedClientData) {
        return;
      }
      onClientSelected(selectedClientData);
    } else {
      // Para novo cliente, tratar campos vazios
      onClientSelected({
        nome: novoClienteData.nome.trim() || 'Usuário não identificado',
        email: novoClienteData.email.trim() || 'não inserido',
        telefone: novoClienteData.telefone.trim() || 'não inserido',
        cpf: novoClienteData.cpf.trim() || 'não inserido'
      });
    }
  };

  const handleClose = () => {
    setTipoSelecao('cadastrado');
    setSelectedClientData(null);
    setNovoClienteData({
      nome: '',
      email: '',
      telefone: '',
      cpf: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Selecionar Cliente para Pagamento em Dinheiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup 
            value={tipoSelecao} 
            onValueChange={(value) => setTipoSelecao(value as 'cadastrado' | 'novo')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cadastrado" id="cadastrado" />
              <Label htmlFor="cadastrado" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Cliente cadastrado
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="novo" id="novo" />
              <Label htmlFor="novo" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4" />
                Novo cliente
              </Label>
            </div>
          </RadioGroup>

          {tipoSelecao === 'cadastrado' && (
            <Card>
              <CardContent className="p-4">
                <ClientDropdownSelector
                  onClientSelected={setSelectedClientData}
                  label="Selecionar cliente:"
                  placeholder="Escolha um cliente"
                />
              </CardContent>
            </Card>
          )}

          {tipoSelecao === 'novo' && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Dados do novo cliente:</h4>
                  
                  <div>
                    <Label htmlFor="novo-cpf">CPF (opcional)</Label>
                    <Input
                      id="novo-cpf"
                      value={novoClienteData.cpf}
                      onChange={(e) => setNovoClienteData(prev => ({ ...prev, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Nota:</strong> Se não informar o CPF, será salvo como "não inserido". 
                      O cliente será identificado como "Usuário não identificado" nos registros.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1"
              disabled={tipoSelecao === 'cadastrado' && !selectedClientData}
            >
              Confirmar Cliente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};