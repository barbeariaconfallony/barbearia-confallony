import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react";

interface Service {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracao: number; // em minutos
  ativo: boolean;
  sala_atendimento: string;
}

const ServiceManagement = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    preco: "",
    duracao: "",
    sala_atendimento: ""
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "servicos"));
      const servicesList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      setServices(servicesList);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar serviços.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.nome || !formData.preco || !formData.duracao || !formData.sala_atendimento) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    try {
      const serviceData = {
        nome: formData.nome,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        duracao: parseInt(formData.duracao),
        sala_atendimento: formData.sala_atendimento,
        ativo: true,
        dataAtualizacao: new Date()
      };

      if (editingService) {
        await updateDoc(doc(db, "servicos", editingService.id), serviceData);
        toast({
          title: "Sucesso!",
          description: "Serviço atualizado com sucesso."
        });
      } else {
        await addDoc(collection(db, "servicos"), {
          ...serviceData,
          dataCriacao: new Date()
        });
        toast({
          title: "Sucesso!",
          description: "Serviço criado com sucesso."
        });
      }

      setFormData({ nome: "", descricao: "", preco: "", duracao: "", sala_atendimento: "" });
      setEditingService(null);
      setIsDialogOpen(false);
      await loadServices();
    } catch (error) {
      console.error("Erro ao salvar serviço:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar serviço.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      nome: service.nome,
      descricao: service.descricao,
      preco: service.preco.toString(),
      duracao: service.duracao.toString(),
      sala_atendimento: service.sala_atendimento || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

    try {
      await deleteDoc(doc(db, "servicos", serviceId));
      toast({
        title: "Sucesso!",
        description: "Serviço excluído com sucesso."
      });
      await loadServices();
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir serviço.",
        variant: "destructive"
      });
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      await updateDoc(doc(db, "servicos", service.id), {
        ativo: !service.ativo,
        dataAtualizacao: new Date()
      });
      await loadServices();
      toast({
        title: "Sucesso!",
        description: `Serviço ${service.ativo ? 'desativado' : 'ativado'} com sucesso.`
      });
    } catch (error) {
      console.error("Erro ao alterar status do serviço:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do serviço.",
        variant: "destructive"
      });
    }
  };

  if (!userData?.isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-muted/30 py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Gerenciamento de Serviços</h1>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="btn-hero flex items-center gap-2"
                  onClick={() => {
                    setEditingService(null);
                    setFormData({ nome: "", descricao: "", preco: "", duracao: "", sala_atendimento: "" });
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Novo Serviço
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Editar Serviço" : "Novo Serviço"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Serviço *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Corte Masculino"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição do serviço..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sala_atendimento">Tipo de Atendimento *</Label>
                    <Select value={formData.sala_atendimento} onValueChange={(value) => setFormData(prev => ({ ...prev, sala_atendimento: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de atendimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Barbearia">Barbearia</SelectItem>
                        <SelectItem value="Podologia">Podologia</SelectItem>
                        <SelectItem value="Quiropraxia">Quiropraxia</SelectItem>
                        <SelectItem value="Relaxamento">Relaxamento</SelectItem>
                        <SelectItem value="Video Game">Video Game</SelectItem>
                      </SelectContent>
                    </Select>
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
                        placeholder="25.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duracao">Duração (min) *</Label>
                      <Input
                        id="duracao"
                        type="number"
                        value={formData.duracao}
                        onChange={(e) => setFormData(prev => ({ ...prev, duracao: e.target.value }))}
                        placeholder="30"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="btn-hero" disabled={isLoading}>
                      {isLoading ? "Salvando..." : editingService ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="barbershop-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{service.nome}</CardTitle>
                    <Badge variant={service.ativo ? "default" : "secondary"}>
                      {service.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {service.descricao && (
                    <p className="text-muted-foreground text-sm">{service.descricao}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-primary">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">R$ {service.preco.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{service.duracao} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant={service.ativo ? "secondary" : "default"}
                      size="sm"
                      onClick={() => toggleServiceStatus(service)}
                      className="flex-1"
                    >
                      {service.ativo ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {services.length === 0 && (
            <Card className="barbershop-card">
              <CardContent className="text-center py-12">
                <div className="text-muted-foreground">
                  <div className="mb-4">Nenhum serviço cadastrado ainda.</div>
                  <p>Clique em "Novo Serviço" para começar.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ServiceManagement;