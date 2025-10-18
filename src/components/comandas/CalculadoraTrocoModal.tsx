import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calculator } from 'lucide-react';

interface CalculadoraTrocoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valorTotal: number;
  onConfirmar: (valorRecebido: number, troco: number) => void;
}

export const CalculadoraTrocoModal: React.FC<CalculadoraTrocoModalProps> = ({
  open,
  onOpenChange,
  valorTotal,
  onConfirmar
}) => {
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [troco, setTroco] = useState<number>(0);

  useEffect(() => {
    const valor = parseFloat(valorRecebido) || 0;
    const trocoCalculado = valor - valorTotal;
    setTroco(trocoCalculado >= 0 ? trocoCalculado : 0);
  }, [valorRecebido, valorTotal]);

  const handleValorRapido = (valor: number) => {
    setValorRecebido(valor.toString());
  };

  const handleConfirmar = () => {
    const valor = parseFloat(valorRecebido) || 0;
    if (valor >= valorTotal) {
      onConfirmar(valor, troco);
      onOpenChange(false);
    }
  };

  const valoresRapidos = [20, 50, 100, 200];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Troco
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Valor Total */}
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {valorTotal.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Valor Recebido */}
          <div className="space-y-2">
            <Label htmlFor="valorRecebido">Valor Recebido</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="valorRecebido"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                className="pl-10 text-lg"
                autoFocus
              />
            </div>
          </div>

          {/* Valores Rápidos */}
          <div className="space-y-2">
            <Label>Valores Rápidos</Label>
            <div className="grid grid-cols-4 gap-2">
              {valoresRapidos.map((valor) => (
                <Button
                  key={valor}
                  variant="outline"
                  size="sm"
                  onClick={() => handleValorRapido(valor)}
                  className="h-12 transition-all duration-200 hover:scale-105"
                >
                  R$ {valor}
                </Button>
              ))}
            </div>
          </div>

          {/* Troco */}
          <Card className={`transition-all duration-300 ${
            troco > 0 ? 'bg-green-500/10 border-green-500/20 animate-fade-in' : 'bg-muted/50'
          }`}>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Troco</p>
                <p className={`text-3xl font-bold transition-colors duration-300 ${
                  troco > 0 ? 'text-green-600' : 'text-muted-foreground'
                }`}>
                  R$ {troco.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmar}
              disabled={parseFloat(valorRecebido) < valorTotal}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
