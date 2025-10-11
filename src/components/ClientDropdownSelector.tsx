import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
}

interface ClienteData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

interface ClientDropdownSelectorProps {
  onClientSelected: (clienteData: ClienteData) => void;
  selectedClientId?: string;
  label?: string;
  placeholder?: string;
  showSearchOutside?: boolean;
}

export const ClientDropdownSelector: React.FC<ClientDropdownSelectorProps> = ({
  onClientSelected,
  selectedClientId,
  label = "Selecionar cliente:",
  placeholder = "Escolha um cliente",
  showSearchOutside = false
}) => {
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>(selectedClientId || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Filtra clientes com base no termo de pesquisa
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientesCadastrados;
    
    const term = searchTerm.toLowerCase();
    return clientesCadastrados.filter(cliente => 
      cliente.nome.toLowerCase().includes(term) ||
      cliente.email.toLowerCase().includes(term) ||
      cliente.telefone.toLowerCase().includes(term) ||
      (cliente.cpf && cliente.cpf.toLowerCase().includes(term))
    );
  }, [clientesCadastrados, searchTerm]);

  useEffect(() => {
    fetchClientesCadastrados();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      setClienteSelecionado(selectedClientId);
    }
  }, [selectedClientId]);

  const fetchClientesCadastrados = async () => {
    try {
      setIsLoading(true);
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const clientes: Cliente[] = [];
      
      usuariosSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.nome && data.email) {
          clientes.push({
            id: doc.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone || '',
            cpf: data.cpf || ''
          });
        }
      });
      
      setClientesCadastrados(clientes);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes cadastrados.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientChange = (clientId: string) => {
    setClienteSelecionado(clientId);
    const cliente = clientesCadastrados.find(c => c.id === clientId);
    if (cliente) {
      onClientSelected({
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        cpf: cliente.cpf || 'não inserido'
      });
    }
  };

  const CustomSelectContent: React.FC<React.ComponentProps<typeof SelectContent>> = (contentProps) => (
    <SelectContent {...contentProps} className="bg-background border border-border shadow-lg z-50">
      {/* Pesquisa dentro do dropdown */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus={false}
          />
        </div>
      </div>
      
      <div className="max-h-60 overflow-y-auto">
        {filteredClientes.map((cliente) => (
          <SelectItem key={cliente.id} value={cliente.id}>
            <div className="flex flex-col py-1">
              <span className="font-medium">{cliente.nome}</span>
              <span className="text-sm text-muted-foreground">
                {cliente.email}
                {cliente.telefone && ` | ${cliente.telefone}`}
                {cliente.cpf && ` | CPF: ${cliente.cpf}`}
              </span>
            </div>
          </SelectItem>
        ))}
        {filteredClientes.length === 0 && !isLoading && (
          <div className="p-4 text-center text-muted-foreground">
            Nenhum cliente encontrado
          </div>
        )}
      </div>
    </SelectContent>
  );

  return (
    <div className="space-y-4">
      {showSearchOutside && (
        <div className="space-y-2">
          <Label htmlFor="search-client">Pesquisar cliente:</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-client"
              placeholder="Buscar por nome, email, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cliente-select">{label}</Label>
        <Select 
          value={clienteSelecionado} 
          onValueChange={handleClientChange}
          disabled={isLoading}
          open={isOpen}
          onOpenChange={setIsOpen}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              isLoading ? "Carregando..." : 
              filteredClientes.length === 0 ? "Nenhum cliente encontrado" :
              placeholder
            } />
          </SelectTrigger>
          <CustomSelectContent 
            onCloseAutoFocus={(e) => e.preventDefault()} 
            onEscapeKeyDown={(e) => e.stopPropagation()} 
          />
        </Select>
      </div>

      {clienteSelecionado && (
        <Card>
          <CardContent className="p-3">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados do cliente selecionado:
            </h4>
            {(() => {
              const cliente = clientesCadastrados.find(c => c.id === clienteSelecionado);
              return cliente ? (
                <div className="text-sm space-y-1">
                  <p><strong>Nome:</strong> {cliente.nome}</p>
                  <p><strong>Email:</strong> {cliente.email}</p>
                  <p><strong>Telefone:</strong> {cliente.telefone || 'Não informado'}</p>
                  <p><strong>CPF:</strong> {cliente.cpf || 'Não informado'}</p>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};