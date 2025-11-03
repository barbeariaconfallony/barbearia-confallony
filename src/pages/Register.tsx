import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Lock, User, Phone, Calendar, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TermosUsoModal } from "@/components/TermosUsoModal";
import { PoliticaPrivacidadeModal } from "@/components/PoliticaPrivacidadeModal";
const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termosOpen, setTermosOpen] = useState(false);
  const [privacidadeOpen, setPrivacidadeOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    data_nascimento: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });
  const {
    register
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.nome || !formData.email || !formData.telefone || !formData.cpf || !formData.password) {
      toast({
        title: "Erro no cadastro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }
    if (formData.password.length < 6) {
      toast({
        title: "Erro no cadastro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    if (!formData.acceptTerms) {
      toast({
        title: "Erro no cadastro",
        description: "Você deve aceitar os termos de uso.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      await register({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        cpf: formData.cpf,
        data_nascimento: formData.data_nascimento
      }, formData.password);
      navigate("/profile");
    } catch (error) {
      // Erro já tratado no AuthContext
    }
    setIsLoading(false);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  return <Layout>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 py-20">
        <div className="max-w-md w-full mx-4">
          <Card className="barbershop-card">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-3xl font-bold">
                Cadastre-se na <span className="text-primary">Confallony</span>
              </CardTitle>
              <p className="text-muted-foreground">
                Crie sua conta e tenha acesso a todos os nossos serviços
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="nome" name="nome" type="text" placeholder="Seu nome completo" value={formData.nome} onChange={handleInputChange} className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={handleInputChange} className="pl-10" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="telefone" name="telefone" type="tel" placeholder="(11) 99999-9999" value={formData.telefone} onChange={handleInputChange} className="pl-10" required />
                  </div>
                </div>

                

                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="data_nascimento" name="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleInputChange} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={formData.password} onChange={handleInputChange} className="pl-10 pr-10" required />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirme sua senha" value={formData.confirmPassword} onChange={handleInputChange} className="pl-10 pr-10" required />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2 p-2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="acceptTerms" checked={formData.acceptTerms} onCheckedChange={checked => setFormData(prev => ({
                  ...prev,
                  acceptTerms: checked as boolean
                }))} />
                  <Label htmlFor="acceptTerms" className="text-sm">
                    Eu aceito os{" "}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setTermosOpen(true);
                      }}
                      className="text-primary hover:text-primary/80 underline"
                    >
                      termos de uso
                    </button>{" "}
                    e{" "}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setPrivacidadeOpen(true);
                      }}
                      className="text-primary hover:text-primary/80 underline"
                    >
                      política de privacidade
                    </button>
                  </Label>
                </div>

                <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Já tem uma conta?
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                    Fazer Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TermosUsoModal open={termosOpen} onOpenChange={setTermosOpen} />
      <PoliticaPrivacidadeModal open={privacidadeOpen} onOpenChange={setPrivacidadeOpen} />
    </Layout>;
};
export default Register;