import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export type Theme = 'light' | 'dark' | 'purple';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Aplicar tema ao DOM
  const applyTheme = (themeName: Theme) => {
    document.documentElement.classList.remove('dark', 'purple');
    if (themeName === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeName === 'purple') {
      document.documentElement.classList.add('purple');
    }
  };

  // Carregar tema salvo no Firestore ou localStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (currentUser) {
          // Usuário autenticado - carregar do Firestore (coleção usuarios)
          const userDoc = await getDoc(doc(db, 'usuarios', currentUser.uid));
          if (userDoc.exists()) {
            const savedTheme = (userDoc.data().theme as Theme) || 'dark';
            setTheme(savedTheme);
            applyTheme(savedTheme);
          } else {
            // Usar tema do localStorage como fallback
            const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
            setTheme(savedTheme);
            applyTheme(savedTheme);
          }
        } else {
          // Usuário não autenticado - usar localStorage
          const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';
          setTheme(savedTheme);
          applyTheme(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        // Fallback para tema padrão escuro
        setTheme('dark');
        applyTheme('dark');
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [currentUser]);

  const changeTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // Salvar no localStorage
    localStorage.setItem('theme', newTheme);
    
    // Salvar no Firestore se usuário autenticado (coleção usuarios)
    if (currentUser) {
      try {
        await setDoc(doc(db, 'usuarios', currentUser.uid), {
          theme: newTheme
        }, { merge: true });
      } catch (error) {
        console.error('Error saving theme to Firestore:', error);
      }
    }
  };

  return {
    theme,
    changeTheme,
    loading
  };
};