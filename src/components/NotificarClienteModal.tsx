import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Edit, Plus, Trash2 } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotificarClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteNome: string;
  clienteTelefone?: string;
  horarioAgendado?: Date;
}

interface MensagemPersonalizada {
  id: string;
  titulo: string;
  conteudo: string;
}

export const NotificarClienteModal = ({
  isOpen,
  onClose,
  clienteNome,
  clienteTelefone,
  horarioAgendado
}: NotificarClienteModalProps) => {
  const { toast } = useToast();
  const [mensagemSelecionada, setMensagemSelecionada] = useState<string>("");
  const [mensagensPersonalizadas, setMensagensPersonalizadas] = useState<MensagemPersonalizada[]>([]);
  const [novaMensagemTitulo, setNovaMensagemTitulo] = useState("");
  const [novaMensagemConteudo, setNovaMensagemConteudo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Carregar mensagens personalizadas do localStorage
  useEffect(() => {
    const mensagensSalvas = localStorage.getItem("mensagensPersonalizadas");
    if (mensagensSalvas) {
      setMensagensPersonalizadas(JSON.parse(mensagensSalvas));
    }
  }, []);

  // Salvar mensagens personalizadas no localStorage
  const salvarMensagensPersonalizadas = (mensagens: MensagemPersonalizada[]) => {
    localStorage.setItem("mensagensPersonalizadas", JSON.stringify(mensagens));
    setMensagensPersonalizadas(mensagens);
  };

  // Calcular tempo até o horário agendado
  const calcularTempoRestante = (): string => {
    if (!horarioAgendado) return "em breve";
    
    const agora = new Date();
    const minutos = differenceInMinutes(horarioAgendado, agora);
    
    if (minutos < 0) return "agora";
    if (minutos === 0) return "agora";
    if (minutos < 60) return `${minutos} minuto${minutos !== 1 ? 's' : ''}`;
    
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    
    if (minutosRestantes === 0) {
      return `${horas} hora${horas !== 1 ? 's' : ''}`;
    }
    return `${horas}h${minutosRestantes}min`;
  };

  // Mensagens prontas
  const mensagensProntas = [
    {
      titulo: "Boas-vindas calorosas",
      conteudo: `Olá ${clienteNome}! É um prazer recebê-lo(a) hoje. Seu atendimento está programado para iniciar em aproximadamente ${calcularTempoRestante()}. Estamos preparando tudo com carinho para você! ✨`
    },
    {
      titulo: "Lembrete gentil",
      conteudo: `Querido(a) ${clienteNome}, passamos para lembrá-lo(a) com carinho que seu horário está chegando em ${calcularTempoRestante()}. Aguardamos você com muito cuidado e atenção! 💙`
    },
    {
      titulo: "Momento especial se aproxima",
      conteudo: `${clienteNome}, faltam apenas ${calcularTempoRestante()} para seu momento especial conosco! Estamos ansiosos para cuidar de você. Aguardamos com carinho! 🌟`
    },
    {
      titulo: "Confirmação delicada",
      conteudo: `Olá ${clienteNome}! Gostaríamos de confirmar sua presença com carinho. Seu atendimento será em ${calcularTempoRestante()}. Conte conosco para cuidar de você com toda atenção! 💫`
    },
    {
      titulo: "Atenção especial",
      conteudo: `${clienteNome}, seu atendimento está se aproximando! Em ${calcularTempoRestante()} começaremos a cuidar de você com todo carinho e profissionalismo. Fique tranquilo(a)! 💈`
    },
    {
      titulo: "Quase chegando",
      conteudo: `${clienteNome}, está quase na hora! Em ${calcularTempoRestante()} será sua vez. Estamos preparando tudo com muito carinho para recebê-lo(a). Aguarde confortavelmente! 🤗`
    },
    {
      titulo: "Aviso cordial",
      conteudo: `Prezado(a) ${clienteNome}, é com satisfação que informamos: seu horário agendado está próximo. Início previsto em ${calcularTempoRestante()}. Estamos prontos para atendê-lo(a) com excelência!`
    },
    {
      titulo: "Seu momento se aproxima",
      conteudo: `${clienteNome}, faltam ${calcularTempoRestante()} para seu atendimento! Preparamos tudo com carinho especial para você. Aguardamos ansiosamente! ⏰💕`
    },
    {
      titulo: "Convite acolhedor",
      conteudo: `Olá ${clienteNome}! Seu atendimento será em ${calcularTempoRestante()}. Fique à vontade e acomode-se confortavelmente. Estamos aqui para cuidar de você! ☕`
    },
    {
      titulo: "Preparação cuidadosa",
      conteudo: `${clienteNome}, em ${calcularTempoRestante()} iniciaremos seu atendimento. Estamos nos preparando com todo carinho e atenção aos detalhes para você. Aguarde tranquilo(a)! 😊`
    },
    {
      titulo: "Chamada especial",
      conteudo: `${clienteNome}, é chegada a hora! Em ${calcularTempoRestante()} começaremos a cuidar de você. Estamos prontos para proporcionar um atendimento maravilhoso! ✂️✨`
    },
    {
      titulo: "Recepção calorosa",
      conteudo: `Seja muito bem-vindo(a), ${clienteNome}! Seu atendimento iniciará em ${calcularTempoRestante()}. Fique à vontade e relaxe. Vamos cuidar de você com todo carinho! 💙`
    },
    {
      titulo: "Tudo pronto para você",
      conteudo: `${clienteNome}, estamos prontos e felizes em recebê-lo(a)! Seu atendimento começará em ${calcularTempoRestante()}. Preparamos tudo com atenção especial! 🌺`
    },
    {
      titulo: "Horário confirmado",
      conteudo: `${clienteNome}, confirmamos seu horário para ${horarioAgendado ? format(horarioAgendado, "HH:mm", { locale: ptBR }) : "em breve"}. Faltam ${calcularTempoRestante()}. Aguardamos você com carinho e profissionalismo! 📋💫`
    },
    {
      titulo: "Lembrete carinhoso",
      conteudo: `Oi ${clienteNome}! Lembrando com carinho: seu horário é em ${calcularTempoRestante()}. Estamos aqui, prontos para cuidar de você da melhor forma! Te esperamos! 💕`
    },
    {
      titulo: "Sua vez está chegando",
      conteudo: `${clienteNome}, você é o próximo! Em ${calcularTempoRestante()} será sua vez. Estamos preparados para oferecer o melhor atendimento. Aguarde só mais um pouquinho! 🎯`
    },
    {
      titulo: "Expectativa carinhosa",
      conteudo: `${clienteNome}, estamos aguardando você com alegria! Seu atendimento começará em ${calcularTempoRestante()}. Preparamos tudo com muito carinho e dedicação! 💝`
    },
    {
      titulo: "Momento especial reservado",
      conteudo: `Olá ${clienteNome}! Seu momento especial conosco está chegando em ${calcularTempoRestante()}. Aguardamos você com carinho para proporcionar uma experiência incrível! ✨`
    },
    {
      titulo: "Prontidão afetuosa",
      conteudo: `${clienteNome}, fique tranquilo(a)! Em ${calcularTempoRestante()} iniciaremos seu atendimento. Estamos preparados para cuidar de você com toda atenção e carinho! 💙`
    },
    {
      titulo: "Início próximo",
      conteudo: `${clienteNome}, seu atendimento começará em ${calcularTempoRestante()}! Estamos ansiosos para recebê-lo(a) e proporcionar um atendimento especial. Até já! 🌟💕`
    }
  ];

  const adicionarMensagemPersonalizada = () => {
    if (!novaMensagemTitulo.trim() || !novaMensagemConteudo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo da mensagem.",
        variant: "destructive"
      });
      return;
    }

    const novaMensagem: MensagemPersonalizada = {
      id: Date.now().toString(),
      titulo: novaMensagemTitulo,
      conteudo: novaMensagemConteudo
    };

    salvarMensagensPersonalizadas([...mensagensPersonalizadas, novaMensagem]);
    setNovaMensagemTitulo("");
    setNovaMensagemConteudo("");
    toast({
      title: "Mensagem adicionada",
      description: "Mensagem personalizada salva com sucesso!"
    });
  };

  const editarMensagemPersonalizada = (id: string) => {
    const mensagem = mensagensPersonalizadas.find(m => m.id === id);
    if (mensagem) {
      setNovaMensagemTitulo(mensagem.titulo);
      setNovaMensagemConteudo(mensagem.conteudo);
      setEditandoId(id);
    }
  };

  const salvarEdicao = () => {
    if (editandoId) {
      const novasMensagens = mensagensPersonalizadas.map(m =>
        m.id === editandoId
          ? { ...m, titulo: novaMensagemTitulo, conteudo: novaMensagemConteudo }
          : m
      );
      salvarMensagensPersonalizadas(novasMensagens);
      setEditandoId(null);
      setNovaMensagemTitulo("");
      setNovaMensagemConteudo("");
      toast({
        title: "Mensagem atualizada",
        description: "Mensagem personalizada atualizada com sucesso!"
      });
    }
  };

  const excluirMensagemPersonalizada = (id: string) => {
    const novasMensagens = mensagensPersonalizadas.filter(m => m.id !== id);
    salvarMensagensPersonalizadas(novasMensagens);
    toast({
      title: "Mensagem excluída",
      description: "Mensagem personalizada removida."
    });
  };

  const enviarMensagem = () => {
    if (!mensagemSelecionada) {
      toast({
        title: "Nenhuma mensagem selecionada",
        description: "Por favor, selecione ou edite uma mensagem antes de enviar.",
        variant: "destructive"
      });
      return;
    }

    // Abrir WhatsApp com a mensagem
    const numeroFormatado = clienteTelefone?.replace(/\D/g, "");
    const mensagemCodificada = encodeURIComponent(mensagemSelecionada);
    const urlWhatsApp = `https://wa.me/${numeroFormatado}?text=${mensagemCodificada}`;
    
    window.open(urlWhatsApp, "_blank");
    
    toast({
      title: "Mensagem enviada",
      description: `WhatsApp aberto para ${clienteNome}`
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notificar Cliente
          </DialogTitle>
          <DialogDescription>
            Cliente: <span className="font-semibold">{clienteNome}</span>
            {horarioAgendado && (
              <span className="ml-2">
                • Horário: {format(horarioAgendado, "HH:mm", { locale: ptBR })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="prontas" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prontas">Mensagens Prontas</TabsTrigger>
            <TabsTrigger value="personalizadas">Minhas Mensagens</TabsTrigger>
            <TabsTrigger value="gerenciar">Gerenciar</TabsTrigger>
          </TabsList>

          <TabsContent value="prontas" className="flex-1 flex flex-col min-h-0 space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {mensagensProntas.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary ${
                      mensagemSelecionada === msg.conteudo ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setMensagemSelecionada(msg.conteudo)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {msg.titulo}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.conteudo}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="personalizadas" className="flex-1 flex flex-col min-h-0 space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {mensagensPersonalizadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma mensagem personalizada salva.</p>
                  <p className="text-sm mt-1">Crie suas mensagens na aba "Gerenciar".</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mensagensPersonalizadas.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:border-primary ${
                        mensagemSelecionada === msg.conteudo ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setMensagemSelecionada(msg.conteudo)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {msg.titulo}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{msg.conteudo}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gerenciar" className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título da Mensagem</label>
                <input
                  type="text"
                  placeholder="Ex: Lembrete personalizado"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  value={novaMensagemTitulo}
                  onChange={(e) => setNovaMensagemTitulo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Conteúdo da Mensagem</label>
                <Textarea
                  placeholder="Digite sua mensagem personalizada..."
                  className="min-h-[100px] resize-none"
                  value={novaMensagemConteudo}
                  onChange={(e) => setNovaMensagemConteudo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Dica: Use {clienteNome} para incluir o nome do cliente automaticamente.
                </p>
              </div>

              <div className="flex gap-2">
                {editandoId ? (
                  <>
                    <Button onClick={salvarEdicao} className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditandoId(null);
                        setNovaMensagemTitulo("");
                        setNovaMensagemConteudo("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button onClick={adicionarMensagemPersonalizada} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Mensagem
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-2">
                {mensagensPersonalizadas.map((msg) => (
                  <div key={msg.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {msg.titulo}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editarMensagemPersonalizada(msg.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => excluirMensagemPersonalizada(msg.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.conteudo}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-4 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem a ser enviada:</label>
            <Textarea
              placeholder="Selecione uma mensagem acima ou edite aqui..."
              className="min-h-[80px] resize-none"
              value={mensagemSelecionada}
              onChange={(e) => setMensagemSelecionada(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={enviarMensagem} disabled={!mensagemSelecionada} className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Enviar via WhatsApp
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
