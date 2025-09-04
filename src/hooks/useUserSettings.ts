import { useState, useEffect } from 'react';

export interface UserSettings {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  phone: string;
}

// MercadoPago credentials removed - now handled securely by Supabase Edge Functions

export interface GeneralSettings {
  enableNotifications: boolean;
  autoConfirmPayments: boolean;
  debugMode: boolean;
  webhookUrl: string;
}

const defaultUserSettings: UserSettings = {
  firstName: '',
  lastName: '',
  email: '',
  cpf: '',
  phone: ''
};

// MercadoPago credentials removed for security

const defaultGeneralSettings: GeneralSettings = {
  enableNotifications: true,
  autoConfirmPayments: false,
  debugMode: false,
  webhookUrl: 'https://vxfofymcvcycfttzhftf.supabase.co/functions/v1/mercadopago-webhook'
};

export const useUserSettings = () => {
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar dados do localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedUserSettings = localStorage.getItem('userSettings');
        const savedGeneralSettings = localStorage.getItem('generalSettings');

        console.log('Carregando dados do localStorage:', {
          hasUserSettings: !!savedUserSettings,
          hasGeneralSettings: !!savedGeneralSettings
        });

        if (savedUserSettings) {
          const parsedSettings = JSON.parse(savedUserSettings);
          console.log('UserSettings carregados:', parsedSettings);
          setUserSettings(parsedSettings);
        } else {
          console.log('Nenhum userSettings encontrado no localStorage');
        }
        
        if (savedGeneralSettings) {
          const parsedGeneral = JSON.parse(savedGeneralSettings);
          setGeneralSettings(parsedGeneral);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setIsLoaded(true);
        console.log('Configurações carregadas. Dados atuais:', userSettings);
      }
    };

    loadSettings();
  }, []);

  // Salvar configurações do usuário
  const saveUserSettings = (settings: UserSettings) => {
    try {
      const settingsToSave = {
        ...settings,
        cpf: settings.cpf.replace(/\D/g, '') // Garante que CPF seja salvo sem formatação
      };
      
      console.log('Salvando userSettings:', settingsToSave);
      setUserSettings(settingsToSave);
      localStorage.setItem('userSettings', JSON.stringify(settingsToSave));
      console.log('userSettings salvos com sucesso no localStorage');
      return true;
    } catch (error) {
      console.error('Erro ao salvar userSettings:', error);
      return false;
    }
  };

  // MercadoPago credentials removed - now handled securely by Supabase Edge Functions

  // Salvar configurações gerais
  const saveGeneralSettings = (settings: GeneralSettings) => {
    try {
      setGeneralSettings(settings);
      localStorage.setItem('generalSettings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Erro ao salvar generalSettings:', error);
      return false;
    }
  };

  // Verificar se os dados do usuário estão completos
  const isUserDataComplete = (): boolean => {
    const complete = !!(
      userSettings.firstName?.trim() && 
      userSettings.lastName?.trim() && 
      userSettings.email?.trim() && 
      userSettings.cpf?.replace(/\D/g, '').length === 11
    );
    
    console.log('Verificando dados completos:', {
      firstName: !!userSettings.firstName?.trim(),
      lastName: !!userSettings.lastName?.trim(),
      email: !!userSettings.email?.trim(),
      cpf: userSettings.cpf?.replace(/\D/g, '').length === 11,
      isComplete: complete,
      currentData: userSettings
    });
    
    return complete;
  };

  // MercadoPago is now always configured via Supabase Edge Functions
  const isMercadoPagoConfigured = (): boolean => {
    return true; // Always configured via Supabase
  };

  // Obter dados do usuário para pagamento
  const getUserDataForPayment = () => {
    const isComplete = isUserDataComplete();
    
    console.log('getUserDataForPayment - dados completos?', isComplete);
    console.log('Dados atuais do usuário:', userSettings);

    // Se os dados estiverem completos, retorna os dados salvos
    if (isComplete) {
      const userData = {
        email: userSettings.email.trim(),
        firstName: userSettings.firstName.trim(),
        lastName: userSettings.lastName.trim(),
        cpf: userSettings.cpf.replace(/\D/g, '') // Remove formatação
      };
      
      console.log('Usando dados do usuário salvos:', userData);
      return userData;
    }

    // Fallback para dados padrão (apenas para desenvolvimento)
    console.warn('Dados do usuário incompletos, usando fallback. Dados atuais:', userSettings);
    return {
      email: 'cliente@email.com',
      firstName: 'Cliente',
      lastName: 'Teste',
      cpf: '19119119100'
    };
  };

  // Limpar todos os dados (opcional)
  const clearAllSettings = () => {
    try {
      setUserSettings(defaultUserSettings);
      setGeneralSettings(defaultGeneralSettings);
      
      localStorage.removeItem('userSettings');
      localStorage.removeItem('generalSettings');
      
      return true;
    } catch (error) {
      console.error('Erro ao limpar configurações:', error);
      return false;
    }
  };

  return {
    userSettings,
    generalSettings,
    saveUserSettings,
    saveGeneralSettings,
    isUserDataComplete,
    isMercadoPagoConfigured,
    getUserDataForPayment,
    clearAllSettings,
    isLoaded
  };
};