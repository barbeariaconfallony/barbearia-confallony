import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Smartphone, Trophy, Crown, Star, Zap, Gift, MessageSquare, Percent, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConfigMobile {
  id?: string;
  // Pontos e Níveis
  pontos_bronze_prata: number;
  pontos_prata_ouro: number;
  pontos_ouro_premium: number;
  pontos_por_real: number;
  validade_pontos_dias: number;
  // Benefícios por Nível
  desconto_bronze: number;
  desconto_prata: number;
  desconto_ouro: number;
  desconto_premium: number;
  bonus_aniversario_bronze: number;
  bonus_aniversario_prata: number;
  bonus_aniversario_ouro: number;
  bonus_aniversario_premium: number;
  // Mensagens Personalizadas
  mensagem_boas_vindas: string;
  mensagem_bronze: string;
  mensagem_prata: string;
  mensagem_ouro: string;
  mensagem_premium: string;
}

const defaultConfig: ConfigMobile = {
  pontos_bronze_prata: 100,
  pontos_prata_ouro: 300,
  pontos_ouro_premium: 600,
  pontos_por_real: 1,
  validade_pontos_dias: 365,
  desconto_bronze: 0,
  desconto_prata: 5,
  desconto_ouro: 10,
  desconto_premium: 15,
  bonus_aniversario_bronze: 10,
  bonus_aniversario_prata: 20,
  bonus_aniversario_ouro: 30,
  bonus_aniversario_premium: 50,
  mensagem_boas_vindas: "Bem-vindo ao nosso programa de fidelidade! A cada R$ 1,00 gasto, você ganha pontos.",
  mensagem_bronze: "Continue acumulando pontos para alcançar o nível Prata e ganhar mais benefícios!",
  mensagem_prata: "Parabéns! Você está no nível Prata. Continue assim para alcançar o Ouro!",
  mensagem_ouro: "Excelente! Você é cliente Ouro. Está quase no nível máximo!",
  mensagem_premium: "Você é um Cliente Premium! Aproveite todos os benefícios exclusivos.",
};

export const AdminConfigMobile = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigMobile>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "config_mobile"));
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as ConfigMobile;
        setConfig({
          id: snapshot.docs[0].id,
          pontos_bronze_prata: data.pontos_bronze_prata || 100,
          pontos_prata_ouro: data.pontos_prata_ouro || 300,
          pontos_ouro_premium: data.pontos_ouro_premium || 600,
          pontos_por_real: data.pontos_por_real || 1,
          validade_pontos_dias: data.validade_pontos_dias || 365,
          desconto_bronze: data.desconto_bronze || 0,
          desconto_prata: data.desconto_prata || 5,
          desconto_ouro: data.desconto_ouro || 10,
          desconto_premium: data.desconto_premium || 15,
          bonus_aniversario_bronze: data.bonus_aniversario_bronze || 10,
          bonus_aniversario_prata: data.bonus_aniversario_prata || 20,
          bonus_aniversario_ouro: data.bonus_aniversario_ouro || 30,
          bonus_aniversario_premium: data.bonus_aniversario_premium || 50,
          mensagem_boas_vindas: data.mensagem_boas_vindas || defaultConfig.mensagem_boas_vindas,
          mensagem_bronze: data.mensagem_bronze || defaultConfig.mensagem_bronze,
          mensagem_prata: data.mensagem_prata || defaultConfig.mensagem_prata,
          mensagem_ouro: data.mensagem_ouro || defaultConfig.mensagem_ouro,
          mensagem_premium: data.mensagem_premium || defaultConfig.mensagem_premium,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configData = {
        pontos_bronze_prata: config.pontos_bronze_prata,
        pontos_prata_ouro: config.pontos_prata_ouro,
        pontos_ouro_premium: config.pontos_ouro_premium,
        pontos_por_real: config.pontos_por_real,
        validade_pontos_dias: config.validade_pontos_dias,
        desconto_bronze: config.desconto_bronze,
        desconto_prata: config.desconto_prata,
        desconto_ouro: config.desconto_ouro,
        desconto_premium: config.desconto_premium,
        bonus_aniversario_bronze: config.bonus_aniversario_bronze,
        bonus_aniversario_prata: config.bonus_aniversario_prata,
        bonus_aniversario_ouro: config.bonus_aniversario_ouro,
        bonus_aniversario_premium: config.bonus_aniversario_premium,
        mensagem_boas_vindas: config.mensagem_boas_vindas,
        mensagem_bronze: config.mensagem_bronze,
        mensagem_prata: config.mensagem_prata,
        mensagem_ouro: config.mensagem_ouro,
        mensagem_premium: config.mensagem_premium,
      };

      if (config.id) {
        // Atualizar existente
        await updateDoc(doc(db, "config_mobile", config.id), configData);
      } else {
        // Criar novo
        const docRef = await addDoc(collection(db, "config_mobile"), configData);
        setConfig((prev) => ({ ...prev, id: docRef.id }));
      }

      toast({
        title: "Configurações salvas!",
        description: "As configurações de pontos foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Configurações Mobile - Sistema de Fidelidade
          </CardTitle>
          <CardDescription>
            Configure todos os aspectos do programa de fidelidade mobile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="niveis" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="niveis">Níveis</TabsTrigger>
              <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
              <TabsTrigger value="pontos">Pontos</TabsTrigger>
              <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
            </TabsList>

            {/* Aba Níveis */}
            <TabsContent value="niveis" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Bronze para Prata */}
                <div className="space-y-2">
                  <Label htmlFor="bronze-prata" className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-gray-400" />
                    Bronze → Prata (100%)
                  </Label>
                  <Input
                    id="bronze-prata"
                    type="number"
                    min="1"
                    value={config.pontos_bronze_prata}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pontos_bronze_prata: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Ex: 100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pontos necessários para alcançar 100% do nível Bronze e passar para Prata
                  </p>
                </div>

                {/* Prata para Ouro */}
                <div className="space-y-2">
                  <Label htmlFor="prata-ouro" className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4 text-gray-300" />
                    Prata → Ouro
                  </Label>
                  <Input
                    id="prata-ouro"
                    type="number"
                    min="1"
                    value={config.pontos_prata_ouro}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pontos_prata_ouro: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Ex: 300"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pontos necessários para avançar de Prata para Ouro
                  </p>
                </div>

                {/* Ouro para Premium */}
                <div className="space-y-2">
                  <Label htmlFor="ouro-premium" className="flex items-center gap-2 text-base">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    Ouro → Cliente Premium
                  </Label>
                  <Input
                    id="ouro-premium"
                    type="number"
                    min="1"
                    value={config.pontos_ouro_premium}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pontos_ouro_premium: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Ex: 600"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pontos necessários para avançar de Ouro para Cliente Premium
                  </p>
                </div>

                {/* Visualização dos Níveis */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-3">
                    <p className="text-sm font-semibold mb-3">Preview dos Níveis:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-gray-400" />
                          Bronze
                        </span>
                        <span className="text-muted-foreground">
                          0 - {config.pontos_bronze_prata} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-gray-300" />
                          Prata
                        </span>
                        <span className="text-muted-foreground">
                          {config.pontos_bronze_prata + 1} - {config.pontos_prata_ouro} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-600" />
                          Ouro
                        </span>
                        <span className="text-muted-foreground">
                          {config.pontos_prata_ouro + 1} - {config.pontos_ouro_premium} pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-background rounded">
                        <span className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-yellow-500" />
                          Cliente Premium
                        </span>
                        <span className="text-muted-foreground">
                          {config.pontos_ouro_premium + 1}+ pts
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Benefícios */}
            <TabsContent value="beneficios" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Descontos por Nível */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Descontos por Nível
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="desc-bronze">Bronze (%)</Label>
                        <Input
                          id="desc-bronze"
                          type="number"
                          min="0"
                          max="100"
                          value={config.desconto_bronze}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              desconto_bronze: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc-prata">Prata (%)</Label>
                        <Input
                          id="desc-prata"
                          type="number"
                          min="0"
                          max="100"
                          value={config.desconto_prata}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              desconto_prata: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc-ouro">Ouro (%)</Label>
                        <Input
                          id="desc-ouro"
                          type="number"
                          min="0"
                          max="100"
                          value={config.desconto_ouro}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              desconto_ouro: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc-premium">Premium (%)</Label>
                        <Input
                          id="desc-premium"
                          type="number"
                          min="0"
                          max="100"
                          value={config.desconto_premium}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              desconto_premium: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bônus de Aniversário */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Bônus de Aniversário (pontos)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bonus-bronze">Bronze</Label>
                        <Input
                          id="bonus-bronze"
                          type="number"
                          min="0"
                          value={config.bonus_aniversario_bronze}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              bonus_aniversario_bronze: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bonus-prata">Prata</Label>
                        <Input
                          id="bonus-prata"
                          type="number"
                          min="0"
                          value={config.bonus_aniversario_prata}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              bonus_aniversario_prata: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bonus-ouro">Ouro</Label>
                        <Input
                          id="bonus-ouro"
                          type="number"
                          min="0"
                          value={config.bonus_aniversario_ouro}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              bonus_aniversario_ouro: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bonus-premium">Premium</Label>
                        <Input
                          id="bonus-premium"
                          type="number"
                          min="0"
                          value={config.bonus_aniversario_premium}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              bonus_aniversario_premium: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Aba Pontos */}
            <TabsContent value="pontos" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pontos-real" className="flex items-center gap-2 text-base">
                    <Zap className="h-4 w-4" />
                    Pontos por Real Gasto
                  </Label>
                  <Input
                    id="pontos-real"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={config.pontos_por_real}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        pontos_por_real: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Ex: 1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantos pontos o cliente ganha para cada R$ 1,00 gasto
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validade" className="flex items-center gap-2 text-base">
                    <CalendarIcon className="h-4 w-4" />
                    Validade dos Pontos (dias)
                  </Label>
                  <Input
                    id="validade"
                    type="number"
                    min="1"
                    value={config.validade_pontos_dias}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        validade_pontos_dias: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Ex: 365"
                  />
                  <p className="text-xs text-muted-foreground">
                    Após quantos dias os pontos expiram (365 = 1 ano)
                  </p>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <p className="text-sm font-semibold mb-3">Exemplo:</p>
                    <div className="space-y-2 text-sm">
                      <p>• Cliente gasta R$ 100,00</p>
                      <p>• Ganha: {config.pontos_por_real * 100} pontos</p>
                      <p>• Pontos válidos por: {config.validade_pontos_dias} dias</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Mensagens */}
            <TabsContent value="mensagens" className="space-y-6 mt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="msg-boas-vindas" className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-4 w-4" />
                    Mensagem de Boas-vindas
                  </Label>
                  <Textarea
                    id="msg-boas-vindas"
                    rows={3}
                    value={config.mensagem_boas_vindas}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mensagem_boas_vindas: e.target.value,
                      }))
                    }
                    placeholder="Mensagem exibida para novos clientes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-bronze">Mensagem - Nível Bronze</Label>
                  <Textarea
                    id="msg-bronze"
                    rows={2}
                    value={config.mensagem_bronze}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mensagem_bronze: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-prata">Mensagem - Nível Prata</Label>
                  <Textarea
                    id="msg-prata"
                    rows={2}
                    value={config.mensagem_prata}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mensagem_prata: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-ouro">Mensagem - Nível Ouro</Label>
                  <Textarea
                    id="msg-ouro"
                    rows={2}
                    value={config.mensagem_ouro}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mensagem_ouro: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg-premium">Mensagem - Cliente Premium</Label>
                  <Textarea
                    id="msg-premium"
                    rows={2}
                    value={config.mensagem_premium}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        mensagem_premium: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={isSaving} className="w-full mt-6">
            {isSaving ? "Salvando..." : "Salvar Todas as Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
