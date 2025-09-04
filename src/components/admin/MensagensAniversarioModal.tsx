import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  orderBy,
  query
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageCircle, 
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MensagemAniversario {
  id: string;
  titulo: string;
  conteudo: string;
  ativa: boolean;
  dataAtualizacao: Date;
  dataCriacao: Date;
}

interface MensagensAniversarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMensagemSelecionada: (mensagem: string) => void;
}

export const MensagensAniversarioModal = ({ 
  open, 
  onOpenChange, 
  onMensagemSelecionada 
}: MensagensAniversarioModalProps) => {
  const [mensagens, setMensagens] = useState<MensagemAniversario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    titulo: "",
    conteudo: ""
  });

  // Carregar mensagens do Firestore
  const loadMensagens = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'mensagens_aniversario'), 
        orderBy('dataCriacao', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const mensagensData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataAtualizacao: doc.data().dataAtualizacao?.toDate() || new Date(),
        dataCriacao: doc.data().dataCriacao?.toDate() || new Date()
      })) as MensagemAniversario[];
      
      setMensagens(mensagensData);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as mensagens.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Carregar mensagens quando o modal abrir
  useEffect(() => {
    if (open) {
      loadMensagens();
    }
  }, [open]);

  // Resetar formulário
  const resetForm = () => {
    setForm({ titulo: "", conteudo: "" });
    setEditingId(null);
    setIsCreating(false);
  };

  // Criar nova mensagem
  const handleCreate = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const novaMensagem = {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        ativa: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date()
      };

      await addDoc(collection(db, 'mensagens_aniversario'), novaMensagem);
      
      toast({
        title: "Sucesso!",
        description: "Mensagem criada com sucesso."
      });
      
      resetForm();
      loadMensagens();
    } catch (error) {
      console.error("Erro ao criar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a mensagem.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Editar mensagem
  const handleEdit = (mensagem: MensagemAniversario) => {
    setForm({
      titulo: mensagem.titulo,
      conteudo: mensagem.conteudo
    });
    setEditingId(mensagem.id);
    setIsCreating(false);
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (!editingId) return;

    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'mensagens_aniversario', editingId), {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        dataAtualizacao: new Date()
      });
      
      toast({
        title: "Sucesso!",
        description: "Mensagem atualizada com sucesso."
      });
      
      resetForm();
      loadMensagens();
    } catch (error) {
      console.error("Erro ao atualizar mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a mensagem.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Excluir mensagem
  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'mensagens_aniversario', id));
      
      toast({
        title: "Sucesso!",
        description: "Mensagem excluída com sucesso."
      });
      
      loadMensagens();
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a mensagem.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Alternar status ativo/inativo
  const handleToggleStatus = async (id: string, ativa: boolean) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'mensagens_aniversario', id), {
        ativa: !ativa,
        dataAtualizacao: new Date()
      });
      
      toast({
        title: "Sucesso!",
        description: `Mensagem ${!ativa ? "ativada" : "desativada"} com sucesso.`
      });
      
      loadMensagens();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da mensagem.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  // Selecionar mensagem para uso
  const handleSelectMensagem = (mensagem: MensagemAniversario) => {
    onMensagemSelecionada(mensagem.conteudo);
    onOpenChange(false);
    toast({
      title: "Mensagem Selecionada",
      description: `"${mensagem.titulo}" foi selecionada.`
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Gerenciar Mensagens de Aniversário
          </SheetTitle>
          <SheetDescription>
            Crie, edite e gerencie suas mensagens de feliz aniversário personalizadas.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-120px)] gap-6 mt-6">
          {/* Formulário de criação/edição */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isCreating || editingId ? (editingId ? "Editar Mensagem" : "Nova Mensagem") : "Adicionar Mensagem"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(isCreating || editingId) ? (
                <>
                  <div>
                    <Label htmlFor="titulo">Título da Mensagem</Label>
                    <Input
                      id="titulo"
                      value={form.titulo}
                      onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Ex: Mensagem Padrão, Mensagem VIP..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="conteudo">Conteúdo da Mensagem</Label>
                    <Textarea
                      id="conteudo"
                      value={form.conteudo}
                      onChange={(e) => setForm(prev => ({ ...prev, conteudo: e.target.value }))}
                      placeholder="Digite sua mensagem de aniversário aqui..."
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={editingId ? handleSaveEdit : handleCreate}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? "Salvar Alterações" : "Criar Mensagem"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetForm}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Nova Mensagem
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Lista de mensagens */}
          <div className="flex-1 overflow-y-auto space-y-4">
            <h3 className="font-semibold text-lg">Mensagens Salvas</h3>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {!isLoading && mensagens.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma mensagem cadastrada ainda.</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && mensagens.map((mensagem) => (
              <Card key={mensagem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{mensagem.titulo}</h4>
                      <p className="text-xs text-muted-foreground">
                        Criada em: {mensagem.dataCriacao.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={mensagem.ativa ? "default" : "secondary"}>
                        {mensagem.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {mensagem.conteudo}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSelectMensagem(mensagem)}
                      disabled={!mensagem.ativa}
                      className="flex-1 min-w-[120px]"
                    >
                      Usar Mensagem
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(mensagem)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(mensagem.id, mensagem.ativa)}
                    >
                      {mensagem.ativa ? "Desativar" : "Ativar"}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a mensagem "{mensagem.titulo}"?
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(mensagem.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};