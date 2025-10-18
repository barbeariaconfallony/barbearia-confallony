import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PagamentoMistoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  valorTotal: number;
  onConfirmar: (valorDinheiro: number, valorPix: number) => void;
}

export const PagamentoMistoModal: React.FC<PagamentoMistoModalProps> = ({
  open,
  onOpenChange,
  valorTotal,
  onConfirmar
}) => {
  const [valorDinheiro, setValorDinheiro] = useState<string>('');
  const [valorPix, setValorPix] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const dinheiro = parseFloat(valorDinheiro) || 0;
    const restante = valorTotal - dinheiro;
    setValorPix(restante > 0 ? restante.toFixed(2) : '0.00');
  }, [valorDinheiro, valorTotal]);

  const handleConfirmar = () => {
    const dinheiro = parseFloat(valorDinheiro) || 0;
    const pix = parseFloat(valorPix) || 0;
    const total = dinheiro + pix;

    if (Math.abs(total - valorTotal) > 0.01) {
      toast({
        title: "Valores incorretos",
        description: "A soma dos valores não corresponde ao total da comanda.",
        variant: "destructive"
      });
      return;
    }

    if (dinheiro <= 0 || pix <= 0) {
      toast({
        title: "Valores inválidos",
        description: "Ambos os valores devem ser maiores que zero.",
        variant: "destructive"
      });
      return;
    }

    onConfirmar(dinheiro, pix);
    onOpenChange(false);
  };

  const totalInformado = (parseFloat(valorDinheiro) || 0) + (parseFloat(valorPix) || 0);
  const diferenca = totalInformado - valorTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagamento Misto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Valor Total */}
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Valor Total da Comanda</p>
                <p className="text-3xl font-bold text-primary">
                  R$ {valorTotal.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Valor em Dinheiro */}
          <div className="space-y-2">
            <Label htmlFor="valorDinheiro" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Valor em Dinheiro Físico
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="valorDinheiro"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorDinheiro}
                onChange={(e) => setValorDinheiro(e.target.value)}
                className="pl-10 text-lg"
                autoFocus
              />
            </div>
          </div>

          <Separator />

          {/* Valor em PIX (calculado automaticamente) */}
          <div className="space-y-2">
            <Label htmlFor="valorPix" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Valor em PIX (calculado)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="valorPix"
                type="number"
                step="0.01"
                value={valorPix}
                readOnly
                className="pl-10 text-lg bg-muted"
              />
            </div>
          </div>

          {/* Resumo */}
          <Card className={`transition-all duration-300 ${
            Math.abs(diferenca) < 0.01 ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
          }`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dinheiro:</span>
                <span className="font-medium">R$ {(parseFloat(valorDinheiro) || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PIX:</span>
                <span className="font-medium">R$ {(parseFloat(valorPix) || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total Informado:</span>
                <span className={`font-bold text-lg ${
                  Math.abs(diferenca) < 0.01 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  R$ {totalInformado.toFixed(2)}
                </span>
              </div>
              {Math.abs(diferenca) > 0.01 && (
                <p className="text-xs text-yellow-600 text-center pt-2">
                  {diferenca > 0 ? 'Excedente' : 'Faltando'}: R$ {Math.abs(diferenca).toFixed(2)}
                </p>
              )}
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
              disabled={Math.abs(diferenca) > 0.01 || totalInformado === 0}
              className="flex-1"
            >
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
