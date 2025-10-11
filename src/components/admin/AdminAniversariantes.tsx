import { useState, useCallback, useMemo, useEffect } from "react";
import { format, isToday, isTomorrow, addDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Cake, 
  Search, 
  MessageCircle, 
  Gift,
  Calendar,
  Phone,
  ExternalLink,
  Settings
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MensagensAniversarioModal } from "./MensagensAniversarioModal";

interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
  pontos_fidelidade?: number;
  saldo?: number;
}

interface AdminAniversariantesProps {
  users: User[];
}

interface MensagemAniversario {
  id: string;
  titulo: string;
  conteudo: string;
  ativa: boolean;
  dataAtualizacao: Date;
  dataCriacao: Date;
}

// Mensagens padrão de fallback
const mensagensPadrao = [
  "🎉 Feliz Aniversário! 🎂 Que este novo ano de vida seja repleto de alegrias, saúde e muitas conquistas! A Barbearia Confallony deseja tudo de melhor para você! ✨",
  "🎈 Parabéns pelo seu dia especial! 🎁 Desejamos que a felicidade esteja sempre presente em sua vida. Obrigado por ser nosso cliente! 🙏",
  "🎂 Hoje é seu dia! 🌟 Que seja um aniversário inesquecível, cheio de momentos especiais e pessoas queridas. Feliz Aniversário da equipe Confallony! 🎉"
];

export const AdminAniversariantes = ({ users }: AdminAniversariantesProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("hoje");
  const [selectedMessage, setSelectedMessage] = useState("");
  const [mensagensDisponiveis, setMensagensDisponiveis] = useState<string[]>([]);
  const [mensagensModalOpen, setMensagensModalOpen] = useState(false);
  const [isLoadingMensagens, setIsLoadingMensagens] = useState(true);
  const { toast } = useToast();

  // Carregar mensagens do Firestore
  const loadMensagensFirestore = useCallback(async () => {
    console.log('🔍 Iniciando carregamento de mensagens do Firestore...');
    setIsLoadingMensagens(true);
    try {
      // Removido o orderBy para evitar necessidade de índice composto
      const q = query(
        collection(db, 'mensagens_aniversario'),
        where('ativa', '==', true)
      );
      console.log('📋 Query criada:', q);
      
      const snapshot = await getDocs(q);
      console.log('📊 Snapshot obtido:', snapshot);
      console.log('📝 Número de documentos encontrados:', snapshot.size);
      
      if (snapshot.empty) {
        console.log('⚠️ Nenhuma mensagem encontrada no Firestore, usando mensagens padrão');
        setMensagensDisponiveis(mensagensPadrao);
        setSelectedMessage(mensagensPadrao[0]);
      } else {
        // Ordenar manualmente por dataCriacao
        const mensagensFirestore = snapshot.docs
          .map((doc) => {
            console.log(`📄 Documento:`, doc.id, doc.data());
            const data = doc.data();
            return {
              conteudo: data.conteudo,
              dataCriacao: data.dataCriacao?.toDate() || new Date()
            };
          })
          .sort((a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime())
          .map(item => item.conteudo);
        
        console.log('✅ Mensagens carregadas do Firestore:', mensagensFirestore);
        setMensagensDisponiveis(mensagensFirestore);
        setSelectedMessage(mensagensFirestore[0]);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar mensagens:", error);
      setMensagensDisponiveis(mensagensPadrao);
      setSelectedMessage(mensagensPadrao[0]);
    } finally {
      setIsLoadingMensagens(false);
    }
  }, []);

  // Carregar mensagens na inicialização
  useEffect(() => {
    loadMensagensFirestore();
  }, [loadMensagensFirestore]);

  // Atualizar mensagem selecionada quando uma nova for escolhida no modal
  const handleMensagemSelecionada = useCallback((mensagem: string) => {
    setSelectedMessage(mensagem);
    // Recarregar mensagens para manter a lista atualizada
    loadMensagensFirestore();
  }, [loadMensagensFirestore]);

  // Função para normalizar telefone
  const normalizePhone = useCallback((phone: string) => {
    return phone.replace(/\D/g, '');
  }, []);

  // Função para enviar mensagem via WhatsApp
  const sendWhatsAppMessage = useCallback((nome: string, telefone: string, message: string) => {
    // Normalizar o telefone para incluir apenas dígitos
    let phoneNumber = normalizePhone(telefone);
    
    // Garantir que tenha o código do país (55)
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    
    // Personalizar mensagem com o nome
    const personalizedMessage = message.replace(/\{nome\}/g, nome);
    
    const encodedMessage = encodeURIComponent(personalizedMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp Aberto",
      description: `Mensagem preparada para ${nome}`,
    });
  }, [normalizePhone, toast]);

  // Filtrar aniversariantes baseado no período selecionado
  const aniversariantes = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horário para comparação precisa
    
    return users.filter(user => {
      if (!user.data_nascimento) return false;
      
      try {
        // Tentar diferentes formatos de data
        let dataNascimento: Date;
        
        if (user.data_nascimento.includes('/')) {
          // Formato DD/MM/YYYY
          dataNascimento = parse(user.data_nascimento, 'dd/MM/yyyy', new Date());
        } else if (user.data_nascimento.includes('-')) {
          // Formato YYYY-MM-DD - usar parse para evitar problemas de fuso horário
          dataNascimento = parse(user.data_nascimento, 'yyyy-MM-dd', new Date());
        } else {
          return false;
        }
        
        if (isNaN(dataNascimento.getTime())) return false;
        
        // Criar data de aniversário para o ano atual
        const aniversarioEsteAno = new Date(hoje.getFullYear(), dataNascimento.getMonth(), dataNascimento.getDate());
        aniversarioEsteAno.setHours(0, 0, 0, 0);
        
        // Se já passou, considerar o próximo ano
        if (aniversarioEsteAno < hoje) {
          aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
        }
        
        const diffTime = aniversarioEsteAno.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`👤 ${user.nome}: data nascimento: ${user.data_nascimento}, aniversário este ano: ${aniversarioEsteAno.toLocaleDateString()}, diferença em dias: ${diffDays}`);
        
        switch (filterPeriod) {
          case "hoje":
            return diffDays === 0;
          case "7dias":
            return diffDays >= 0 && diffDays <= 7;
          case "15dias":
            return diffDays >= 0 && diffDays <= 15;
          case "mes":
            return diffDays >= 0 && diffDays <= 30;
          default:
            return false;
        }
      } catch (error) {
        console.error("Erro ao processar data de nascimento:", error);
        return false;
      }
    }).filter(user => {
      if (!searchTerm) return true;
      return user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
             user.email.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [users, filterPeriod, searchTerm]);

  // Função para calcular idade
  const calcularIdade = useCallback((dataNascimento: string) => {
    try {
      let dataDate: Date;
      
      if (dataNascimento.includes('/')) {
        dataDate = parse(dataNascimento, 'dd/MM/yyyy', new Date());
      } else if (dataNascimento.includes('-')) {
        // Usar parse para evitar problemas de fuso horário
        dataDate = parse(dataNascimento, 'yyyy-MM-dd', new Date());
      } else {
        return 0;
      }
      
      const hoje = new Date();
      let idade = hoje.getFullYear() - dataDate.getFullYear();
      const mesAtual = hoje.getMonth();
      const diaAtual = hoje.getDate();
      
      if (mesAtual < dataDate.getMonth() || 
          (mesAtual === dataDate.getMonth() && diaAtual < dataDate.getDate())) {
        idade--;
      }
      
      return idade + 1; // +1 porque será o aniversário
    } catch (error) {
      return 0;
    }
  }, []);

  // Função para formatar data de aniversário
  const formatarDataAniversario = useCallback((dataNascimento: string) => {
    try {
      let dataDate: Date;
      
      if (dataNascimento.includes('/')) {
        dataDate = parse(dataNascimento, 'dd/MM/yyyy', new Date());
      } else if (dataNascimento.includes('-')) {
        // Usar parse para evitar problemas de fuso horário
        dataDate = parse(dataNascimento, 'yyyy-MM-dd', new Date());
      } else {
        return "Data inválida";
      }
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const aniversarioEsteAno = new Date(hoje.getFullYear(), dataDate.getMonth(), dataDate.getDate());
      aniversarioEsteAno.setHours(0, 0, 0, 0);
      
      // Se já passou, considerar o próximo ano
      if (aniversarioEsteAno < hoje) {
        aniversarioEsteAno.setFullYear(hoje.getFullYear() + 1);
      }
      
      const diffTime = aniversarioEsteAno.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return "Hoje";
      } else if (diffDays === 1) {
        return "Amanhã";
      } else {
        return format(aniversarioEsteAno, "dd 'de' MMMM", { locale: ptBR });
      }
    } catch (error) {
      return "Data inválida";
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold">Aniversariantes</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setMensagensModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Gerenciar Mensagens
          </Button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="7dias">Próximos 7 dias</SelectItem>
              <SelectItem value="15dias">Próximos 15 dias</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Cake className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{aniversariantes.length}</p>
            <p className="text-sm text-muted-foreground">
              {filterPeriod === 'hoje' ? 'Hoje' : 
               filterPeriod === '7dias' ? 'Próximos 7 dias' : 
               filterPeriod === '15dias' ? 'Próximos 15 dias' : 'Este mês'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">
              {aniversariantes.filter(u => u.telefone).length}
            </p>
            <p className="text-sm text-muted-foreground">Com WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de aniversariantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aniversariantes.map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <Cake className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.nome}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                
                {user.data_nascimento && (() => {
                  try {
                    let dataNascimento: Date;
                    if (user.data_nascimento.includes('/')) {
                      dataNascimento = parse(user.data_nascimento, 'dd/MM/yyyy', new Date());
                    } else if (user.data_nascimento.includes('-')) {
                      // Usar parse para evitar problemas de fuso horário
                      dataNascimento = parse(user.data_nascimento, 'yyyy-MM-dd', new Date());
                    } else {
                      return false;
                    }
                    
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    
                    const aniversarioEsteAno = new Date(hoje.getFullYear(), dataNascimento.getMonth(), dataNascimento.getDate());
                    aniversarioEsteAno.setHours(0, 0, 0, 0);
                    
                    const diffTime = aniversarioEsteAno.getTime() - hoje.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    return diffDays === 0;
                  } catch {
                    return false;
                  }
                })() && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">Hoje!</Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aniversário:</span>
                  <span className="font-medium">
                    {user.data_nascimento ? formatarDataAniversario(user.data_nascimento) : 'Não informado'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Idade:</span>
                  <span className="font-medium">
                    {user.data_nascimento ? `${calcularIdade(user.data_nascimento)} anos` : 'N/A'}
                  </span>
                </div>
                
                {user.telefone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Telefone:</span>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{user.telefone}</span>
                    </div>
                  </div>
                )}
              </div>

              {user.telefone && (
                <div className="mt-4 pt-4 border-t">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Enviar Parabéns
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Mensagem de Aniversário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Cliente:</Label>
                          <p className="font-medium">{user.nome}</p>
                        </div>
                        
                        <div>
                          <Label htmlFor="mensagem">Escolha uma mensagem:</Label>
                          <Select 
                            value={selectedMessage} 
                            onValueChange={setSelectedMessage}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione uma mensagem" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 bg-background border z-50">
                              {isLoadingMensagens ? (
                                <SelectItem value="loading" disabled className="bg-background">
                                  Carregando mensagens...
                                </SelectItem>
                              ) : mensagensDisponiveis.length > 0 ? (
                                mensagensDisponiveis.map((msg, index) => (
                                  <SelectItem key={index} value={msg} className="bg-background hover:bg-accent">
                                    Mensagem {index + 1} - {msg.substring(0, 50)}...
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="empty" disabled className="bg-background">
                                  Nenhuma mensagem cadastrada
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          {/* Debug info */}
                          <p className="text-xs text-muted-foreground mt-1">
                            {mensagensDisponiveis.length} mensagem(ns) disponível(is)
                          </p>
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-line">{selectedMessage}</p>
                        </div>
                        
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => sendWhatsAppMessage(user.nome, user.telefone || '', selectedMessage)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir WhatsApp
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {!user.telefone && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center">
                    Telefone não cadastrado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {aniversariantes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Cake className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum aniversariante encontrado</h3>
            <p className="text-muted-foreground">
              {filterPeriod === 'hoje' ? 'Não há aniversários hoje.' :
               filterPeriod === '7dias' ? 'Não há aniversários nos próximos 7 dias.' :
               filterPeriod === '15dias' ? 'Não há aniversários nos próximos 15 dias.' :
               'Não há aniversários este mês.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de gerenciamento de mensagens */}
      <MensagensAniversarioModal
        open={mensagensModalOpen}
        onOpenChange={setMensagensModalOpen}
        onMensagemSelecionada={handleMensagemSelecionada}
      />
    </div>
  );
};