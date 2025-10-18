import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Header } from '@/components/Header';
import { 
  Settings as SettingsIcon, 
  User, 
  CreditCard, 
  Shield, 
  Save,
  Eye,
  EyeOff,
  Check,
  AlertTriangle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { toast } = useToast();
  const {
    userSettings,
    generalSettings,
    saveUserSettings,
    saveGeneralSettings,
    isUserDataComplete,
    isMercadoPagoConfigured
  } = useUserSettings();
  
  // Estados para controle de interface
  const [showCredentials, setShowCredentials] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleUserSettingsChange = (field: keyof typeof userSettings, value: string) => {
    const updatedSettings = { ...userSettings, [field]: value };
    saveUserSettings(updatedSettings);
  };

  // MercadoPago credentials removed for security

  const handleGeneralSettingsChange = (field: keyof typeof generalSettings, value: boolean | string) => {
    const updatedSettings = { ...generalSettings, [field]: value };
    saveGeneralSettings(updatedSettings);
  };

  const handleSaveUserSettings = async () => {
    setSaving(true);
    try {
      // Validar dados antes de salvar
      if (!userSettings.firstName || !userSettings.lastName || !userSettings.email || !userSettings.cpf) {
        toast({
          title: "Dados incompletos",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Validar CPF
      const cleanCPF = userSettings.cpf.replace(/\D/g, '');
      if (cleanCPF.length !== 11) {
        toast({
          title: "CPF inválido",
          description: "O CPF deve ter 11 dígitos.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Salvar dados
      const success = saveUserSettings(userSettings);
      
      if (success) {
        toast({
          title: "Configurações salvas!",
          description: "Seus dados pessoais foram salvos com sucesso.",
        });
        console.log('Dados salvos:', userSettings);
      } else {
        throw new Error('Falha ao salvar');
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // MercadoPago credentials removed for security

  const handleSaveGeneralSettings = async () => {
    setSaving(true);
    try {
      await saveGeneralSettings(generalSettings);
      toast({
        title: "Configurações salvas!",
        description: "As configurações gerais foram salvas com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getCredentialStatus = () => {
    return isMercadoPagoConfigured() ? 'configured' : 'not-configured';
  };

  const validateCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  };

  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleanValue.slice(0, 14);
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return cleanValue.slice(0, 15);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
        </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        {/* Aba de Dados Pessoais */}
        <TabsContent value="user">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Configure seus dados pessoais para os pagamentos e agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={userSettings.firstName}
                    onChange={(e) => handleUserSettingsChange('firstName', e.target.value)}
                    placeholder="Seu primeiro nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    value={userSettings.lastName}
                    onChange={(e) => handleUserSettingsChange('lastName', e.target.value)}
                    placeholder="Seu sobrenome"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  onChange={(e) => handleUserSettingsChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  required
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={userSettings.cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      handleUserSettingsChange('cpf', formatted);
                    }}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                  {userSettings.cpf && !validateCPF(userSettings.cpf) && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      CPF inválido (deve ter 11 dígitos)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={userSettings.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      handleUserSettingsChange('phone', formatted);
                    }}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>✅ Seguro:</strong> Estes dados são usados para processar pagamentos PIX através do Supabase. 
                  As credenciais do Mercado Pago estão protegidas no backend.
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveUserSettings} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Dados Pessoais
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MercadoPago credentials removed for security - now handled by Supabase Edge Functions */}

        {/* Aba de Configurações Gerais */}
        <TabsContent value="general">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>
                Configure o comportamento geral da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações sobre pagamentos e agendamentos
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.enableNotifications}
                    onCheckedChange={(checked) => handleGeneralSettingsChange('enableNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Confirmação automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Confirmar agendamentos automaticamente após pagamento aprovado
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.autoConfirmPayments}
                    onCheckedChange={(checked) => handleGeneralSettingsChange('autoConfirmPayments', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Modo Debug</Label>
                    <p className="text-sm text-muted-foreground">
                      Mostrar logs detalhados no console (apenas desenvolvimento)
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.debugMode}
                    onCheckedChange={(checked) => handleGeneralSettingsChange('debugMode', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">URL do Webhook</Label>
                  <Input
                    id="webhookUrl"
                    value={generalSettings.webhookUrl}
                    onChange={(e) => handleGeneralSettingsChange('webhookUrl', e.target.value)}
                    placeholder="https://sua-url.com/webhook"
                  />
                  <p className="text-sm text-muted-foreground">
                    URL onde o Mercado Pago enviará notificações de pagamento
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneralSettings} disabled={saving}>
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};