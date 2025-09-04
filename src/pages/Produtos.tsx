import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
import Layout from '@/components/layout/Layout';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CheckoutModal } from '@/components/produtos/CheckoutModal';

interface Product {
  id: string;
  nome: string;
  preco: number;
  imageUrl?: string;
  descricao: string;
  estoque: number;
  categoria: string;
  tipo_venda?: string;
  ativo: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

const Produtos = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    loadProducts();
    loadCartFromLocalStorage();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "produtos"), 
        where("tipo_venda", "==", "barbearia"),
        where("ativo", "==", true)
      );
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsList);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      showError("Erro", "Erro ao carregar produtos.");
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar carrinho do localStorage
  const loadCartFromLocalStorage = () => {
    try {
      const savedCart = localStorage.getItem('barbershop_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Erro ao carregar carrinho do localStorage:", error);
    }
  };

  // Salvar carrinho no localStorage
  const saveCartToLocalStorage = (cartItems: CartItem[]) => {
    try {
      localStorage.setItem('barbershop_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Erro ao salvar carrinho no localStorage:", error);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        newCart = [...prevCart, { ...product, quantity: 1 }];
      }
      saveCartToLocalStorage(newCart);
      return newCart;
    });
    showSuccess(
      "Produto adicionado", 
      `${product.nome} foi adicionado ao carrinho`
    );
  };

  const removeFromCart = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    setCart(newCart);
    saveCartToLocalStorage(newCart);
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prevCart => {
      const newCart = prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
      saveCartToLocalStorage(newCart);
      return newCart;
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.preco * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      showError("Erro", "Carrinho vazio");
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleCheckoutCompleto = async (formaPagamento?: string) => {
    try {
      // Limpar carrinho (os dados já são salvos pelo CheckoutModal)
      setCart([]);
      saveCartToLocalStorage([]);
      loadProducts(); // Recarregar produtos para atualizar estoque
      showSuccess("Compra finalizada!", "Obrigado pela sua compra!");
    } catch (error) {
      console.error("Erro ao finalizar compra:", error);
      showError("Erro", "Erro ao finalizar compra. Tente novamente.");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">Produtos</h1>
        </div>

        {/* Barra de pesquisa e carrinho */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          
          <Button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 relative"
            variant="outline"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden sm:inline">Carrinho</span>
            {getCartItemCount() > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {getCartItemCount()}
              </Badge>
            )}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando produtos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in hover-scale">
                <div className="aspect-square overflow-hidden relative">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={product.nome}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {/* Badges no canto superior direito */}
                  <div className="absolute top-2 right-2 space-y-1">
                    <Badge 
                      className={`text-xs ${product.estoque === 0 ? 'bg-destructive text-destructive-foreground animate-pulse cursor-pointer hover:scale-105 transition-transform' : 'bg-primary text-primary-foreground'}`}
                      onClick={product.estoque === 0 ? () => navigate('/admin?tab=produtos&sub=barbearia') : undefined}
                    >
                      Estoque: {product.estoque}
                    </Badge>
                    <Badge variant="secondary" className="block text-xs">
                      {product.categoria}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{product.nome}</h3>
                  <p className="text-2xl font-bold text-primary mb-3">
                    R$ {product.preco.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-muted-foreground mb-4 text-sm">
                    {product.descricao}
                  </p>
                  <Button 
                    onClick={() => addToCart(product)}
                    className="w-full hover-scale"
                    disabled={product.estoque <= 0}
                  >
                    {product.estoque <= 0 ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum produto encontrado para "{searchTerm}"
            </p>
          </div>
        )}
      </div>

      {/* Sheet lateral do carrinho */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Seu Carrinho
            </SheetTitle>
          </SheetHeader>

          {/* Conteúdo do carrinho */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Seu carrinho está vazio
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Adicione produtos para começar suas compras
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 border-b">
                    <img
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.nome}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">{item.nome}</h4>
                      <p className="text-xs text-muted-foreground">
                        R$ {item.preco.toFixed(2).replace('.', ',')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-6 w-6"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-6 w-6"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        R$ {(item.preco * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.id)}
                        className="text-destructive hover:text-destructive h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão e Total fixos no fundo */}
          {cart.length > 0 && (
            <div className="border-t px-6 py-4 bg-background flex-shrink-0 space-y-4">
              {/* Botão de Finalizar Compra */}
              <Button
                onClick={handleCheckout}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4"
                size="lg"
              >
                🛒 Finalizar Compra
              </Button>

              {/* Total */}
              <div className="flex justify-between items-center text-xl font-bold border-t pt-4">
                <span className="text-foreground">Total:</span>
                <span className="text-primary text-2xl">R$ {getCartTotal().toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de Checkout */}
      <CheckoutModal 
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cart}
        onCheckoutCompleto={handleCheckoutCompleto}
      />
    </Layout>
  );
};

export default Produtos;