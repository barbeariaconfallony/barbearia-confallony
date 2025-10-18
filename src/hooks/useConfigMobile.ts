import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ConfigMobile {
  pontos_bronze_prata: number;
  pontos_prata_ouro: number;
  pontos_ouro_premium: number;
  pontos_por_real: number;
  validade_pontos_dias: number;
  desconto_bronze: number;
  desconto_prata: number;
  desconto_ouro: number;
  desconto_premium: number;
  bonus_aniversario_bronze: number;
  bonus_aniversario_prata: number;
  bonus_aniversario_ouro: number;
  bonus_aniversario_premium: number;
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

export const useConfigMobile = () => {
  const [config, setConfig] = useState<ConfigMobile>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'config_mobile'));
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data() as ConfigMobile;
          setConfig({
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
        console.error('Erro ao carregar configurações mobile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { config, loading };
};
