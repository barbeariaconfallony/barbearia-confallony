import { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Check, Scissors, Search, CreditCard, Banknote, User, AlertTriangle, TrendingUp, Package } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useComandas } from "@/hooks/useComandas";
import { useEstoque } from "@/hooks/useEstoque";
import { NovaComandaModal } from "@/components/comandas/NovaComandaModal";
import { EditarComandaModal } from "@/components/comandas/EditarComandaModal";
import { PagamentoComandaModal } from "@/components/comandas/PagamentoComandaModal";
import { HistoricoClienteModal } from "@/components/comandas/HistoricoClienteModal";
import { MetricasComparativasCard } from "@/components/comandas/MetricasComparativasCard";
import { ScrollArea } from "@/components/ui/scroll-area";

const Comandas = () => {
  const [selectedComandaId, setSelectedComandaId] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("abertas");
  const [novaComandaOpen, setNovaComandaOpen] = useState(false);
  const [editarComandaOpen, setEditarComandaOpen] = useState(false);
  const [pagamentoComandaOpen, setPagamentoComandaOpen] = useState(false);
  const [historicoClienteOpen, setHistoricoClienteOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [selectedClienteNome, setSelectedClienteNome] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPageAbertas, setCurrentPageAbertas] = useState(1);
  const [currentPageFinalizadas, setCurrentPageFinalizadas] = useState(1);
  const [metricasModalOpen, setMetricasModalOpen] = useState(false);
  const [estoqueModalOpen, setEstoqueModalOpen] = useState(false);
  
  const ITEMS_PER_PAGE = 3;
  
  const { 
    comandas, 
    comandasFinalizadas,
    produtos, 
    usuarios, 
    loading, 
    criarComanda, 
    atualizarComanda, 
    finalizarComanda 
  } = useComandas();

  const { produtosEstoqueBaixo, loading: loadingEstoque } = useEstoque();

  // Filtrar comandas por nome do cliente
  const filteredComandas = useMemo(() => {
    return comandas.filter(comanda => 
      comanda.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [comandas, searchTerm]);

  const filteredComandasFinalizadas = useMemo(() => {
    return comandasFinalizadas.filter(comanda => 
      comanda.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [comandasFinalizadas, searchTerm]);

  // Paginação
  const paginatedComandas = useMemo(() => {
    const startIndex = (currentPageAbertas - 1) * ITEMS_PER_PAGE;
    return filteredComandas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredComandas, currentPageAbertas]);
  
  // Reset pagination when changing tabs or search
  const handleTabChange = (value: string) => {
    setSelectedTab(value);
    setCurrentPageAbertas(1);
    setCurrentPageFinalizadas(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPageAbertas(1);
    setCurrentPageFinalizadas(1);
  };
  const paginatedComandasFinalizadas = useMemo(() => {
    const startIndex = (currentPageFinalizadas - 1) * ITEMS_PER_PAGE;
    return filteredComandasFinalizadas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredComandasFinalizadas, currentPageFinalizadas]);

  const totalPagesAbertas = Math.ceil(filteredComandas.length / ITEMS_PER_PAGE);
  const totalPagesFinalizadas = Math.ceil(filteredComandasFinalizadas.length / ITEMS_PER_PAGE);

  const todasComandas = [...comandas, ...comandasFinalizadas];
  const comandaAtual = todasComandas.find(c => c.id === selectedComandaId);
  
  // Auto-select first comanda when available
  if (!selectedComandaId && paginatedComandas.length > 0) {
    setSelectedComandaId(paginatedComandas[0].id);
  }

  const handleVerHistorico = (clienteId: string, clienteNome: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClienteId(clienteId);
    setSelectedClienteNome(clienteNome);
    setHistoricoClienteOpen(true);
  };

  const renderComandaCard = (comanda: any) => (
    <Card 
      key={comanda.id} 
      className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        selectedComandaId === comanda.id 
          ? 'bg-primary/10 border-primary shadow-sm animate-fade-in' 
          : 'hover:bg-muted/50 hover:shadow-sm'
      }`}
      onClick={() => setSelectedComandaId(comanda.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">#{comanda.numero}</span>
            <Badge 
              variant={comanda.status === 'Aberta' ? 'secondary' : 'outline'} 
              className="text-xs"
            >
              {comanda.status}
            </Badge>
            {/* Ícone do tipo de pagamento para comandas finalizadas */}
            {comanda.status === 'Finalizada' && comanda.tipo_pagamento && (
              <div className="flex items-center gap-1">
                {comanda.tipo_pagamento === 'PIX' ? (
                  <CreditCard className="h-3 w-3 text-blue-600" />
                ) : (
                  <Banknote className="h-3 w-3 text-green-600" />
                )}
                <span className="text-xs text-muted-foreground">{comanda.tipo_pagamento}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-medium line-clamp-1 flex-1">{comanda.cliente_nome}</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-primary/10"
            onClick={(e) => handleVerHistorico(comanda.cliente_id, comanda.cliente_nome, e)}
            title="Ver histórico do cliente"
          >
            <User className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {comanda.status === 'Finalizada' ? (
            <>
              {comanda.data_finalizacao && `Finalizada: ${comanda.data_finalizacao.toLocaleDateString('pt-BR')}`}
              {comanda.data_pagamento && (
                <span className="block">
                  Pago: {comanda.data_pagamento.toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </>
          ) : (
            `Criada: ${comanda.data_criacao.toLocaleDateString('pt-BR')}`
          )}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {comanda.itens.length} {comanda.itens.length === 1 ? 'item' : 'itens'}
          </span>
          <span className="text-sm font-bold text-primary">
            R$ {comanda.total.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Comandas</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie as comandas abertas do estabelecimento</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Modal de Métricas Comparativas */}
            <Dialog open={metricasModalOpen} onOpenChange={setMetricasModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <TrendingUp className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Comparativo de Períodos</DialogTitle>
                </DialogHeader>
                <MetricasComparativasCard />
              </DialogContent>
            </Dialog>

            {/* Modal de Alertas de Estoque */}
            <Dialog open={estoqueModalOpen} onOpenChange={setEstoqueModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={`h-10 w-10 relative ${
                    produtosEstoqueBaixo.length > 0 
                      ? 'border-orange-500 hover:bg-orange-500/10' 
                      : ''
                  }`}
                >
                  <Package 
                    className={`h-5 w-5 ${
                      produtosEstoqueBaixo.length > 0 
                        ? 'text-orange-500' 
                        : ''
                    }`} 
                  />
                  {produtosEstoqueBaixo.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {produtosEstoqueBaixo.length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas de Estoque ({produtosEstoqueBaixo.length})
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[400px] pr-4">
                  {loadingEstoque ? (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-sm">Carregando...</div>
                    </div>
                  ) : produtosEstoqueBaixo.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <div className="text-sm">Nenhum produto com estoque baixo</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {produtosEstoqueBaixo.map((produto) => (
                        <div 
                          key={produto.id} 
                          className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg border border-orange-500/20 hover:bg-orange-500/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{produto.produto_nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Estoque mínimo: {produto.quantidade_minima} {produto.unidade}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant="destructive" 
                            className="ml-2 flex-shrink-0 bg-orange-600 hover:bg-orange-700"
                          >
                            {produto.quantidade_disponivel} {produto.unidade}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 lg:gap-6 min-h-[calc(100vh-200px)]">
          {/* Lista de Comandas - 1 coluna em mobile, 2 de 5 colunas em xl */}
          <div className="xl:col-span-2 order-1">
            <Card className="h-full">
              <CardContent className="p-4">
                {/* Barra de Pesquisa */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Tabs value={selectedTab} onValueChange={handleTabChange} className="h-[calc(100%-80px)]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="abertas" className="text-sm">Abertas</TabsTrigger>
                      <TabsTrigger value="finalizadas" className="text-sm">Finalizadas</TabsTrigger>
                    </TabsList>
                    <Button 
                      size="sm" 
                      className="gap-2 w-full sm:w-auto"
                      onClick={() => setNovaComandaOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Nova Comanda</span>
                    </Button>
                  </div>
                  
                  <TabsContent value="abertas" className="space-y-3 mt-0 h-[calc(100%-80px)]">
                    <div className="overflow-y-auto h-full space-y-2 pr-2">
                      {loading ? (
                        <div className="text-center text-muted-foreground py-8">
                          <div className="text-sm">Carregando...</div>
                        </div>
                      ) : filteredComandas.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <div className="text-sm">
                            {searchTerm ? 'Nenhuma comanda encontrada' : 'Nenhuma comanda aberta'}
                          </div>
                        </div>
                      ) : (
                        <>
                          {paginatedComandas.map((comanda) => renderComandaCard(comanda))}
                          
                          {/* Paginação Comandas Abertas */}
                          {totalPagesAbertas > 1 && (
                            <div className="pt-4">
                              <Pagination className="justify-center">
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => setCurrentPageAbertas(Math.max(1, currentPageAbertas - 1))}
                                      className={currentPageAbertas === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                  {Array.from({ length: Math.min(5, totalPagesAbertas) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => setCurrentPageAbertas(page)}
                                          isActive={currentPageAbertas === page}
                                          className="cursor-pointer"
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  })}
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => setCurrentPageAbertas(Math.min(totalPagesAbertas, currentPageAbertas + 1))}
                                      className={currentPageAbertas === totalPagesAbertas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="finalizadas" className="space-y-3 mt-0 h-[calc(100%-80px)]">
                    <div className="overflow-y-auto h-full space-y-2 pr-2">
                      {loading ? (
                        <div className="text-center text-muted-foreground py-8">
                          <div className="text-sm">Carregando...</div>
                        </div>
                      ) : filteredComandasFinalizadas.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                          <div className="text-sm">
                            {searchTerm ? 'Nenhuma comanda encontrada' : 'Nenhuma comanda finalizada'}
                          </div>
                        </div>
                      ) : (
                        <>
                          {paginatedComandasFinalizadas.map((comanda) => renderComandaCard(comanda))}
                          
                          {/* Paginação Comandas Finalizadas */}
                          {totalPagesFinalizadas > 1 && (
                            <div className="pt-4">
                              <Pagination className="justify-center">
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => setCurrentPageFinalizadas(Math.max(1, currentPageFinalizadas - 1))}
                                      className={currentPageFinalizadas === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                  {Array.from({ length: Math.min(5, totalPagesFinalizadas) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                      <PaginationItem key={page}>
                                        <PaginationLink
                                          onClick={() => setCurrentPageFinalizadas(page)}
                                          isActive={currentPageFinalizadas === page}
                                          className="cursor-pointer"
                                        >
                                          {page}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  })}
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => setCurrentPageFinalizadas(Math.min(totalPagesFinalizadas, currentPageFinalizadas + 1))}
                                      className={currentPageFinalizadas === totalPagesFinalizadas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes da Comanda - 3 de 5 colunas em xl */}
          <div className="xl:col-span-3 order-2">
            {comandaAtual ? (
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold truncate">Comanda #{comandaAtual.numero}</h2>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        <span className="font-medium">{comandaAtual.cliente_nome}</span>
                        <span className="hidden sm:inline"> • </span>
                        <span className="block sm:inline text-xs sm:text-sm">
                          {comandaAtual.status === 'Finalizada' ? (
                            <>
                              {comandaAtual.data_finalizacao && 
                                `Finalizada em ${comandaAtual.data_finalizacao.toLocaleDateString('pt-BR')} às ${comandaAtual.data_finalizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                              }
                              {comandaAtual.tipo_pagamento && comandaAtual.data_pagamento && (
                                <span className="block mt-1">
                                  <div className="flex items-center gap-2">
                                    {comandaAtual.tipo_pagamento === 'PIX' ? (
                                      <CreditCard className="h-3 w-3 text-blue-600" />
                                    ) : (
                                      <Banknote className="h-3 w-3 text-green-600" />
                                    )}
                                    <span>{comandaAtual.tipo_pagamento} - {comandaAtual.data_pagamento.toLocaleString('pt-BR', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}</span>
                                  </div>
                                </span>
                              )}
                            </>
                          ) : (
                            `Criada em ${comandaAtual.data_criacao.toLocaleDateString('pt-BR')} às ${comandaAtual.data_criacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                          )}
                        </span>
                      </p>
                    </div>
                    {comandaAtual.status === 'Aberta' && (
                      <div className="flex flex-row gap-2 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditarComandaOpen(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setPagamentoComandaOpen(true)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Finalizar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-6 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                    {comandaAtual.itens.map((item, index) => (
                      <Card key={index} className="border border-muted">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                <Scissors className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm leading-tight line-clamp-1">{item.produto_nome}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>Qtd: {item.quantidade}</span>
                                  <span>Unit: R$ {item.preco_unitario.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-base font-bold text-primary">R$ {item.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Resumo da Comanda */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg font-semibold">Total da Comanda</p>
                          <p className="text-sm text-muted-foreground">{comandaAtual.itens.length} {comandaAtual.itens.length === 1 ? 'item' : 'itens'} • Status: {comandaAtual.status}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${comandaAtual.status === 'Aberta' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            R$ {comandaAtual.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <div className="text-muted-foreground">
                    <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Selecione uma comanda</p>
                    <p className="text-sm">Escolha uma comanda da lista para ver os detalhes</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
      </div>

      {/* Modais */}
      <HistoricoClienteModal
        open={historicoClienteOpen}
        onOpenChange={setHistoricoClienteOpen}
        clienteId={selectedClienteId}
        clienteNome={selectedClienteNome}
      />

      <NovaComandaModal
          open={novaComandaOpen}
          onOpenChange={setNovaComandaOpen}
          usuarios={usuarios}
          produtos={produtos}
          onCreateComanda={criarComanda}
        />

        <EditarComandaModal
          open={editarComandaOpen}
          onOpenChange={setEditarComandaOpen}
          comanda={comandaAtual}
          produtos={produtos}
          onUpdateComanda={atualizarComanda}
        />

        <PagamentoComandaModal
          open={pagamentoComandaOpen}
          onOpenChange={setPagamentoComandaOpen}
          comanda={comandaAtual}
          onPagamentoCompleto={(comandaId, tipoPagamento, clienteData) => finalizarComanda(comandaId, tipoPagamento, clienteData)}
        />
      </div>
    </Layout>
  );
};

export default Comandas;