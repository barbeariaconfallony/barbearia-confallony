import { useState, useMemo } from 'react';
import { Plus, Minus, X, Search, Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Produto, ItemComanda } from '@/hooks/useComandas';

interface NovaComandaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuarios: any[];
  produtos: Produto[];
  onCreateComanda: (cliente_id: string, cliente_nome: string, itens: ItemComanda[], cliente_cpf?: string, cliente_telefone?: string, cliente_email?: string) => void;
}

export const NovaComandaModal = ({
  open,
  onOpenChange,
  usuarios,
  produtos,
  onCreateComanda
}: NovaComandaModalProps) => {
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [itens, setItens] = useState<ItemComanda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleCriarComanda = () => {
    if (!clienteSelecionado || itens.length === 0) return;

    const cliente = usuarios.find(u => u.id === clienteSelecionado);
    onCreateComanda(
      clienteSelecionado, 
      cliente?.nome || '', 
      itens,
      cliente?.cpf,
      cliente?.telefone,
      cliente?.email
    );
    
    // Reset form
    setClienteSelecionado('');
    setItens([]);
    onOpenChange(false);
  };

  const resetForm = () => {
    setClienteSelecionado('');
    setClienteDropdownOpen(false);
    setItens([]);
    setSearchTerm('');
  };

  // Filtra produtos para comandas e por termo de busca
  const produtosComanda = useMemo(() => {
    const produtosFiltrados = produtos.filter(produto => produto.tipo_venda === 'comanda');
    
    if (!searchTerm) return produtosFiltrados;
    
    return produtosFiltrados.filter(produto =>
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [produtos, searchTerm]);

  // Encontra o cliente selecionado
  const clienteAtual = usuarios.find(u => u.id === clienteSelecionado);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Nova Comanda</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Seleção de Cliente e Produtos */}
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="cliente-select" className="text-sm sm:text-base">Cliente</Label>
              
              <Popover open={clienteDropdownOpen} onOpenChange={setClienteDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteDropdownOpen}
                    className="w-full justify-between text-sm sm:text-base h-9 sm:h-10"
                  >
                    {clienteAtual ? clienteAtual.nome : "Selecione um cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-[60]">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." className="h-9 text-sm" />
                    <CommandList className="max-h-[200px] sm:max-h-[300px]">
                      <CommandEmpty className="text-sm py-6">Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {usuarios.map((usuario) => (
                          <CommandItem
                            key={usuario.id}
                            value={`${usuario.nome} ${usuario.email} ${usuario.telefone || ''} ${usuario.cpf || ''}`}
                            onSelect={() => {
                              setClienteSelecionado(usuario.id === clienteSelecionado ? '' : usuario.id);
                              setClienteDropdownOpen(false);
                            }}
                            className="text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0",
                                clienteSelecionado === usuario.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-sm truncate">{usuario.nome}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {usuario.email}
                                {usuario.telefone && ` | ${usuario.telefone}`}
                                {usuario.cpf && ` | CPF: ${usuario.cpf}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="produtos-list" className="text-sm sm:text-base">Produtos para Comanda ({produtosComanda.length})</Label>
              
              {/* Barra de pesquisa */}
              <div className="relative mb-2 sm:mb-3 mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm h-9 sm:h-10"
                />
              </div>
              
              <div className="max-h-[250px] sm:max-h-[350px] lg:max-h-[400px] overflow-y-auto space-y-2">
                {produtosComanda.map((produto) => (
                  <Card 
                    key={produto.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => adicionarProduto(produto)}
                  >
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex gap-2 sm:gap-3 items-center">
                        {/* Imagem do produto */}
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                          {produto.imageUrl ? (
                            <img 
                              src={produto.imageUrl} 
                              alt={produto.nome}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem imagem</div>';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                              Sem imagem
                            </div>
                          )}
                        </div>
                        
                        {/* Informações do produto */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{produto.nome}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            R$ {produto.preco.toFixed(2)}
                          </p>
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            {produto.categoria}
                          </Badge>
                        </div>
                        
                        {/* Botão adicionar */}
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:h-9 sm:w-9">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Itens Selecionados */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm sm:text-base font-medium">Itens da Comanda</label>
              <Badge variant="outline" className="text-xs">{itens.length} itens</Badge>
            </div>

            <div className="max-h-[250px] sm:max-h-[350px] lg:max-h-[400px] overflow-y-auto space-y-2">
              {itens.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  Nenhum item selecionado
                </div>
              ) : (
                itens.map((item) => (
                  <Card key={item.produto_id}>
                    <CardContent className="p-2 sm:p-3">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{item.produto_nome}</h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            R$ {item.preco_unitario.toFixed(2)} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alterarQuantidade(item.produto_id, item.quantidade - 1)}
                            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 sm:w-8 text-center text-sm">{item.quantidade}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => alterarQuantidade(item.produto_id, item.quantidade + 1)}
                            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removerItem(item.produto_id)}
                            className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                       <div className="text-left mt-2">
                         <span className="font-medium text-sm sm:text-base">Total: R$ {item.total.toFixed(2)}</span>
                       </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Total e Ações */}
            <div className="border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center text-base sm:text-lg font-semibold">
                <span>Total:</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-9 sm:h-10 text-sm sm:text-base"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCriarComanda}
                  disabled={!clienteSelecionado || itens.length === 0}
                  className="flex-1 h-9 sm:h-10 text-sm sm:text-base"
                >
                  Criar Comanda
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};