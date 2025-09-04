import { useState, useEffect } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Produto, ItemComanda, Comanda } from '@/hooks/useComandas';

interface EditarComandaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: Comanda | null;
  produtos: Produto[];
  onUpdateComanda: (comandaId: string, itens: ItemComanda[]) => void;
}

export const EditarComandaModal = ({
  open,
  onOpenChange,
  comanda,
  produtos,
  onUpdateComanda
}: EditarComandaModalProps) => {
  const [itens, setItens] = useState<ItemComanda[]>([]);

  useEffect(() => {
    if (comanda) {
      setItens([...comanda.itens]);
    }
  }, [comanda]);

  const adicionarProduto = (produto: Produto) => {
    const itemExistente = itens.find(item => item.produto_id === produto.id);
    
    if (itemExistente) {
      setItens(itens.map(item =>
        item.produto_id === produto.id
          ? {
              ...item,
              quantidade: item.quantidade + 1,
              total: (item.quantidade + 1) * item.preco_unitario
            }
          : item
      ));
    } else {
      setItens([...itens, {
        produto_id: produto.id,
        produto_nome: produto.nome,
        quantidade: 1,
        preco_unitario: produto.preco,
        total: produto.preco
      }]);
    }
  };

  const alterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      setItens(itens.filter(item => item.produto_id !== produtoId));
    } else {
      setItens(itens.map(item =>
        item.produto_id === produtoId
          ? {
              ...item,
              quantidade: novaQuantidade,
              total: novaQuantidade * item.preco_unitario
            }
          : item
      ));
    }
  };

  const removerItem = (produtoId: string) => {
    setItens(itens.filter(item => item.produto_id !== produtoId));
  };

  const total = itens.reduce((sum, item) => sum + item.total, 0);

  const handleSalvarAlteracoes = () => {
    if (!comanda || itens.length === 0) return;

    onUpdateComanda(comanda.id, itens);
    onOpenChange(false);
  };

  const produtosDisponiveis = produtos.filter(produto => 
    !itens.some(item => item.produto_id === produto.id)
  );

  if (!comanda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Comanda #{comanda.numero}</DialogTitle>
          <p className="text-sm text-muted-foreground">{comanda.cliente_nome}</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 overflow-hidden">
          {/* Produtos Disponíveis */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Adicionar Produtos</label>
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {produtosDisponiveis.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Todos os produtos já foram adicionados
                  </div>
                ) : (
                  produtosDisponiveis.map((produto) => (
                    <Card 
                      key={produto.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => adicionarProduto(produto)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{produto.nome}</h4>
                            <p className="text-sm text-muted-foreground">
                              R$ {produto.preco.toFixed(2)}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {produto.categoria}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Itens da Comanda */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Itens da Comanda</label>
              <Badge variant="outline">{itens.length} itens</Badge>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {itens.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum item na comanda
                </div>
              ) : (
                itens.map((item) => (
                  <Card key={item.produto_id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.produto_nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            R$ {item.preco_unitario.toFixed(2)} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{item.quantidade}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(item.produto_id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <span className="font-medium">R$ {item.total.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Total e Ações */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSalvarAlteracoes}
                  disabled={itens.length === 0}
                  className="flex-1"
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};