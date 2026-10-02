import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { AuthContextData, UsuarioLogado } from '../types/auth';

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restaura sessão salva ao iniciar o app
  useEffect(() => {
    async function carregarDadosSalvos() {
      try {
        let tokenSalvo = await AsyncStorage.getItem('@hope_token');
        let userSalvo = await AsyncStorage.getItem('@hope_user');

        if (!tokenSalvo && typeof window !== 'undefined' && window.localStorage) {
          tokenSalvo = window.localStorage.getItem('@hope_token');
          userSalvo = window.localStorage.getItem('@hope_user');
        }

        if (tokenSalvo && userSalvo) {
          const usuarioObjeto: UsuarioLogado = JSON.parse(userSalvo);
          setToken(tokenSalvo);
          setUser(usuarioObjeto);
          api.defaults.headers.common['Authorization'] = `Bearer ${tokenSalvo}`;
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão salva:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarDadosSalvos();
  }, []);

  const login = async (loginOuEmail: string, senha: string): Promise<void> => {
    try {
      const payload = {
        email: loginOuEmail.trim(),
        senha: senha,
      };

      const response = await api.post<any>('/auth/login', payload);
      const data = response.data;
      const jwtToken = data.token;

      if (!jwtToken) {
        throw new Error('Token JWT não recebido do servidor.');
      }

      // Mapeia exatamente com a resposta da sua API
      const usuarioLogado: UsuarioLogado = {
        id: data.id || (data.usuario && data.usuario.id) || 0,
        nome: data.nome || (data.usuario && data.usuario.nome) || 'Voluntário',
        email: data.email || (data.usuario && data.usuario.email) || loginOuEmail,
        empresaId: data.empresaId || (data.usuario && data.usuario.empresaId),
        nomeEmpresa: data.nomeEmpresa || (data.usuario && data.usuario.nomeEmpresa) || 'Hope Escala Pro',
        role: data.perfil || data.role || 'MINISTRO',
      };

      // 1. Configura o cabeçalho padrão para as próximas requisições
      api.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;

      // 2. ATUALIZA O ESTADO IMEDIATAMENTE (dispara a troca de rota no React)
      setToken(jwtToken);
      setUser(usuarioLogado);

      // 3. Salva no Storage em background (sem travar a navegação)
      AsyncStorage.setItem('@hope_token', jwtToken).catch(console.error);
      AsyncStorage.setItem('@hope_user', JSON.stringify(usuarioLogado)).catch(console.error);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('@hope_token', jwtToken);
        window.localStorage.setItem('@hope_user', JSON.stringify(usuarioLogado));
      }
    } catch (error: any) {
      console.error('Erro no login:', error.response?.data || error.message);
      throw error;
    }
  };

  const updateUser = (novoUsuario: UsuarioLogado) => {
  setUser(novoUsuario);
  if (Platform.OS === 'web') {
    localStorage.setItem('@HopeEscala:user', JSON.stringify(novoUsuario));
  } else {
    AsyncStorage.setItem('@HopeEscala:user', JSON.stringify(novoUsuario));
  }
};


  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await AsyncStorage.multiRemove(['@hope_token', '@hope_user']);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('@hope_token');
        window.localStorage.removeItem('@hope_user');
      }

      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        signed: Boolean(user && token),
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextData {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
