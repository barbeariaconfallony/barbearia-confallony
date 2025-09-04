import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Package, Camera, X, SwitchCamera } from "lucide-react";
import { useCameraCapture } from "@/hooks/useCameraCapture";

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  estoque: number;
  categoria: string;
  tipo_venda?: string;
  ativo: boolean;
  imageUrl?: string;
}

const ProductManagement = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const {
    isCapturing,
    capturedImageUrl,
    isUploading,
    isVideoLoading,
    currentCamera,
    startCapture,
    capturePhoto,
    stopCapture,
    switchCamera,
    videoRef,
    canvasRef
  } = useCameraCapture();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentTab, setCurrentTab] = useState<"comanda" | "barbearia">("comanda");
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    estoque: "",
    categoria: "",
    tipo_venda: "",
    imageUrl: ""
  });

  const categoriasComanda = [
    "Bebidas",
    "Lanches",
    "Pratos Principais",
    "Sobremesas",
    "Petiscos",
    "Outros"
  ];

  const categoriasBarbearia = [
    "Pomadas",
    "Shampoos",
    "Condicionadores",
    "Óleos para Barba",
    "Bálsamos",
    "Perfumes",
    "Acessórios",
    "Ferramentas",
    "Outros"
  ];

  const getCurrentCategorias = () => {
    return currentTab === "comanda" ? categoriasComanda : categoriasBarbearia;
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "produtos"));
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar produtos.",
        variant: "destructive"
      });
    }
  };

  const getFilteredProducts = (tipo: "comanda" | "barbearia") => {
    return products.filter(product => product.tipo_venda === tipo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.nome || !formData.preco || !formData.categoria) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      // Determinar tipo_venda baseado na aba atual se não estiver editando
      const tipoVenda = editingProduct ? formData.tipo_venda : currentTab;
      
      const productData = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        estoque: parseInt(formData.estoque) || 0,
        categoria: formData.categoria,
        tipo_venda: tipoVenda,
        imageUrl: formData.imageUrl || capturedImageUrl || "",
        ativo: true,
        dataAtualizacao: new Date()
      };

      if (editingProduct) {
        await updateDoc(doc(db, "produtos", editingProduct.id), productData);
        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso."
        });
      } else {
        await addDoc(collection(db, "produtos"), {
          ...productData,
          dataCriacao: new Date()
        });
        toast({
          title: "Sucesso!",
          description: "Produto criado com sucesso."
        });
      }

      setFormData({ nome: "", descricao: "", preco: "", estoque: "", categoria: "", tipo_venda: "", imageUrl: "" });
      setEditingProduct(null);
      setIsDialogOpen(false);
      stopCapture(); // Encerrar câmera após salvar
      await loadProducts();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar produto.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setCurrentTab(product.tipo_venda as "comanda" | "barbearia");
    setFormData({
      nome: product.nome,
      descricao: product.descricao,
      preco: product.preco.toString(),
      estoque: product.estoque.toString(),
      categoria: product.categoria,
      tipo_venda: product.tipo_venda || "",
      imageUrl: product.imageUrl || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      await deleteDoc(doc(db, "produtos", productId));
      toast({
        title: "Sucesso!",
        description: "Produto excluído com sucesso."
      });
      await loadProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir produto.",
        variant: "destructive"
      });
    }
  };

  const handleSale = async (product: Product) => {
    if (product.estoque <= 0) {
      toast({
        title: "Erro",
        description: "Produto sem estoque.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Atualizar estoque
      await updateDoc(doc(db, "produtos", product.id), {
        estoque: product.estoque - 1,
        dataAtualizacao: new Date()
      });

      // Registrar venda
      await addDoc(collection(db, "vendas"), {
        produtoId: product.id,
        nomeProduto: product.nome,
        preco: product.preco,
        tipo_venda: product.tipo_venda,
        clienteId: userData?.uid,
        nomeCliente: userData?.nome,
        dataVenda: new Date(),
        formaPagamento: "local" // Pagamento no local
      });

      toast({
        title: "Venda registrada!",
        description: `${product.nome} vendido com sucesso.`
      });

      await loadProducts();
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar venda.",
        variant: "destructive"
      });
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await updateDoc(doc(db, "produtos", product.id), {
        ativo: !product.ativo,
        dataAtualizacao: new Date()
      });
      await loadProducts();
      toast({
        title: "Sucesso!",
        description: `Produto ${product.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });
    } catch (error) {
      console.error("Erro ao alterar status do produto:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do produto.",
        variant: "destructive"
      });
    }
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <Card key={product.id} className="barbershop-card">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{product.nome}</CardTitle>
          <Badge variant={product.ativo ? "default" : "secondary"}>
            {product.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <Badge variant="outline" className="w-fit">
          {product.categoria}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Imagem do Produto */}
        {product.imageUrl && (
          <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
            <img 
              src={product.imageUrl} 
              alt={product.nome}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {product.descricao && (
          <p className="text-muted-foreground text-sm">{product.descricao}</p>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1 text-primary">
            <DollarSign className="h-4 w-4" />
            <span className="font-semibold">R$ {product.preco.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{product.estoque} un.</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(product)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleSale(product)}
            disabled={product.estoque <= 0 || !product.ativo}
            className="flex-1"
          >
            Vender
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={product.ativo ? "secondary" : "default"}
            size="sm"
            onClick={() => toggleProductStatus(product)}
            className="flex-1"
          >
            {product.ativo ? "Desativar" : "Ativar"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(product.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!userData?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-20">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gerenciamento de Produtos</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="btn-hero flex items-center gap-2"
                onClick={() => {
                  setEditingProduct(null);
                  setFormData({ nome: "", descricao: "", preco: "", estoque: "", categoria: "", tipo_venda: "", imageUrl: "" });
                }}
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Editar Produto" : `Novo Produto - ${currentTab === "comanda" ? "Comanda" : "Barbearia"}`}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder={currentTab === "comanda" ? "Ex: Hambúrguer Artesanal" : "Ex: Pomada Modeladora"}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {getCurrentCategorias().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição do produto..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço (R$) *</Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco: e.target.value }))}
                      placeholder="15.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estoque">Estoque</Label>
                    <Input
                      id="estoque"
                      type="number"
                      value={formData.estoque}
                      onChange={(e) => setFormData(prev => ({ ...prev, estoque: e.target.value }))}
                      placeholder="10"
                    />
                  </div>
                </div>
                
                 {/* Seção de Captura de Foto - Para ambos os tipos */}
                {(!editingProduct || editingProduct.tipo_venda === currentTab) && (
                  <div className="space-y-4">
                    <Label>Foto do Produto</Label>
                    
                    {/* Botão Tirar Foto */}
                    {!isCapturing && !capturedImageUrl && !formData.imageUrl && (
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          startCapture();
                        }}
                        className="w-full flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Tirar Foto
                      </Button>
                    )}
                    
                     {/* Preview da Câmera */}
                    {isCapturing && (
                      <div className="space-y-4">
                        <div className="relative w-full aspect-[9/16] max-w-[200px] mx-auto bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-300">
                          <video 
                            ref={videoRef} 
                            className="w-full h-full object-cover"
                            autoPlay 
                            playsInline 
                            muted
                            style={{
                              minWidth: '100%',
                              minHeight: '100%'
                            }}
                          />
                          
                          {/* Overlay de loading - só aparece quando está carregando */}
                          {isVideoLoading && (
                            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/75">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Carregando câmera...</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            onClick={async () => {
                              try {
                                await capturePhoto();
                              } catch (error) {
                                console.error('Erro ao executar capturePhoto:', error);
                              }
                            }}
                            disabled={isUploading}
                            className="flex-1"
                          >
                            {isUploading ? "Enviando..." : "Capturar"}
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={switchCamera}
                            disabled={isUploading}
                            title={`Trocar para câmera ${currentCamera === 'user' ? 'traseira' : 'frontal'}`}
                          >
                            <SwitchCamera className="h-4 w-4" />
                          </Button>
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={stopCapture}
                            disabled={isUploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                     {/* Imagem Capturada */}
                    {(capturedImageUrl || formData.imageUrl) && (
                      <div className="space-y-2">
                        <div className="relative w-full aspect-[9/16] max-w-[200px] mx-auto bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={capturedImageUrl || formData.imageUrl} 
                            alt="Produto"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, imageUrl: "" }));
                            // Reset captured image if it was from camera
                            if (capturedImageUrl) {
                              startCapture();
                            }
                          }}
                          className="w-full"
                        >
                          Tirar Nova Foto
                        </Button>
                      </div>
                    )}
                    
                    {/* Canvas oculto para processamento */}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="btn-hero" disabled={isLoading}>
                    {isLoading ? "Salvando..." : editingProduct ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as "comanda" | "barbearia")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="comanda">Comanda</TabsTrigger>
            <TabsTrigger value="barbearia">Barbearia</TabsTrigger>
          </TabsList>
          
          <TabsContent value="comanda" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredProducts("comanda").map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {getFilteredProducts("comanda").length === 0 && (
              <Card className="barbershop-card">
                <CardContent className="text-center py-12">
                  <div className="text-muted-foreground">
                    <div className="mb-4">Nenhum produto de comanda cadastrado ainda.</div>
                    <p>Clique em "Novo Produto" para começar.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="barbearia" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredProducts("barbearia").map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {getFilteredProducts("barbearia").length === 0 && (
              <Card className="barbershop-card">
                <CardContent className="text-center py-12">
                  <div className="text-muted-foreground">
                    <div className="mb-4">Nenhum produto de barbearia cadastrado ainda.</div>
                    <p>Clique em "Novo Produto" para começar.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProductManagement;