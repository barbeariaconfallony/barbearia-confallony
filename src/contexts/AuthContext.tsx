import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface UserData {
  uid: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento?: string;
  data_registro: Date;
  pontos_fidelidade: number;
  saldo: number;
  isAdmin: boolean;
  ativo: boolean;
  avatar_url?: string;
  tempo_atendimento?: number;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  userRoles: string[];
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (userData: Omit<UserData, 'uid' | 'data_registro' | 'pontos_fidelidade' | 'saldo' | 'isAdmin' | 'ativo'>, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Buscar roles do Supabase usando Firebase UID (mapeamento via tabela profiles ou similar)
  const loadUserRoles = async (firebaseUid: string) => {
    try {
      // IMPORTANTE: Firebase UID não é UUID do Supabase
      // Aqui você precisa mapear o Firebase UID para o Supabase UUID
      // Por enquanto, vamos apenas tentar e capturar o erro
      console.log('🔍 Buscando roles para Firebase UID:', firebaseUid);
      
      // TODO: Criar uma tabela de mapeamento firebase_uid -> supabase_uuid
      // Por enquanto, desabilitando a busca de roles já que temos isAdmin no Firebase
      setUserRoles([]);
      return [];
      
      /* Quando implementar mapeamento, usar algo como:
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .single();
      
      if (profileError || !profileData) {
        console.warn('Perfil não encontrado no Supabase para este usuário Firebase');
        return [];
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profileData.id);

      if (error) {
        console.error('Erro ao buscar roles:', error);
        return [];
      }

      const roles = data?.map(r => r.role) || [];
      setUserRoles(roles);
      return roles;
      */
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      return [];
    }
  };

  // Carrega dados do usuário do Firestore
  const loadUserData = async (user: User) => {
    try {
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userData: UserData = {
          uid: user.uid,
          nome: data.nome || user.displayName || '',
          email: data.email || user.email || '',
          telefone: data.telefone || '',
          cpf: data.cpf || '',
          data_nascimento: data.data_nascimento,
          data_registro: data.data_registro?.toDate() || new Date(),
          pontos_fidelidade: data.pontos_fidelidade || 0,
          saldo: data.saldo || 0,
          isAdmin: data.isAdmin || false,
          ativo: data.ativo !== undefined ? data.ativo : true,
          avatar_url: data.avatar_url || '',
          tempo_atendimento: data.tempo_atendimento || 40
        };
        
        setUserData(userData);
        
        // Salva dados básicos (sem informações sensíveis)
        const safeUserData = {
          uid: userData.uid,
          nome: userData.nome,
          email: userData.email,
          data_registro: userData.data_registro.toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(safeUserData));
        
        return userData;
      } else {
        // Se não existe documento, cria um básico
        const newUserData: UserData = {
          uid: user.uid,
          nome: user.displayName || '',
          email: user.email || '',
          telefone: '',
          cpf: '',
          data_registro: new Date(),
          pontos_fidelidade: 0,
          saldo: 0,
          isAdmin: false,
          ativo: true,
          tempo_atendimento: 40
        };
        
        await setDoc(doc(db, 'usuarios', user.uid), {
          ...newUserData,
          data_registro: newUserData.data_registro
        });
        
        setUserData(newUserData);
        const safeUserData = {
          uid: newUserData.uid,
          nome: newUserData.nome,
          email: newUserData.email,
          data_registro: newUserData.data_registro.toISOString()
        };
        localStorage.setItem('userData', JSON.stringify(safeUserData));
        
        return newUserData;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      
      // Fallback para localStorage
      const storedData = localStorage.getItem('userData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          const userData: UserData = {
            ...parsedData,
            data_registro: new Date(parsedData.data_registro)
          };
          setUserData(userData);
          return userData;
        } catch (parseError) {
          console.error('Erro ao parsear dados armazenados:', parseError);
        }
      }
      
      throw error;
    }
  };

  // Login
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // SEGURANÇA: Não salvar credenciais por questões de segurança
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email);
      } else {
        localStorage.removeItem('rememberEmail');
        localStorage.removeItem('savedCredentials');
      }
      
      await loadUserData(userCredential.user);
      
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!",
      });
    } catch (error: any) {
      console.error('Erro no login:', error);
      
      let errorMessage = "Erro no login. Verifique suas credenciais.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "Usuário não encontrado.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Senha incorreta.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Muitas tentativas de login. Tente novamente mais tarde.";
      }
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Registro
  const register = async (
    userData: Omit<UserData, 'uid' | 'data_registro' | 'pontos_fidelidade' | 'saldo' | 'isAdmin' | 'ativo'>, 
    password: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
      
      // Cria documento no Firestore
      const newUserData: UserData = {
        ...userData,
        uid: userCredential.user.uid,
        data_registro: new Date(),
        pontos_fidelidade: 0,
        saldo: 0,
        isAdmin: false,
        ativo: true
      };
      
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        ...newUserData,
        data_registro: newUserData.data_registro
      });
      
      setUserData(newUserData);
      const safeUserData = {
        uid: newUserData.uid,
        nome: newUserData.nome,
        email: newUserData.email,
        data_registro: newUserData.data_registro.toISOString()
      };
      localStorage.setItem('userData', JSON.stringify(safeUserData));
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Bem-vindo à Barbearia Confallony!",
      });
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      let errorMessage = "Erro no cadastro. Tente novamente.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Este email já está em uso.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "A senha é muito fraca.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido.";
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive"
      });
      
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      localStorage.removeItem('userData');
      localStorage.removeItem('savedCredentials');
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout.",
        variant: "destructive"
      });
    }
  };

  // Atualizar dados do usuário
  const updateUserData = async (data: Partial<UserData>) => {
    if (!currentUser) return;

    try {
      await updateDoc(doc(db, 'usuarios', currentUser.uid), data);
      
      // Recarrega dados atualizados
      await loadUserData(currentUser);
      
      toast({
        title: "Dados atualizados!",
        description: "Suas informações foram atualizadas com sucesso."
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Auto-login removido por questões de segurança
  const attemptAutoLogin = async () => {
    // Limpar credenciais antigas se existirem
    localStorage.removeItem('savedCredentials');
  };

  // Listener de mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          await loadUserData(user);
          await loadUserRoles(user.uid);
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setUserRoles([]);
        localStorage.removeItem('userData');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Tentativa de auto-login na inicialização
  useEffect(() => {
    if (!currentUser && !loading) {
      attemptAutoLogin();
    }
  }, [currentUser, loading]);

  const value = {
    currentUser,
    userData,
    userRoles,
    loading,
    login,
    register,
    logout,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};