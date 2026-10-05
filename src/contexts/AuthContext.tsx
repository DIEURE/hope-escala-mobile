import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  role?: string;
  departamentoId?: number;
  empresaId?: number;
  nomeEmpresa?: string;
  fotoUrl?: string;
  instrumento?: string;
}

export interface AuthContextData {
  signed: boolean;
  user: UsuarioLogado | null;
  token: string | null;
  loading: boolean;
  login: (emailOuDados: string | any, senha?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (novoUsuario: Partial<UsuarioLogado>) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioLogado | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getArmazenamento = async (chave: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' ? localStorage.getItem(chave) : null;
    }
    return await AsyncStorage.getItem(chave);
  };

  const setArmazenamento = async (chave: string, valor: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.setItem(chave, valor);
      return;
    }
    await AsyncStorage.setItem(chave, valor);
  };

  const removeArmazenamento = async (chave: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') localStorage.removeItem(chave);
      return;
    }
    await AsyncStorage.removeItem(chave);
  };

  useEffect(() => {
    async function carregarSessao() {
      try {
        const tokenSalvo = await getArmazenamento('@HopeEscala:token');
        const userSalvo = await getArmazenamento('@HopeEscala:user');

        if (tokenSalvo && userSalvo) {
          api.defaults.headers.common['Authorization'] = `Bearer ${tokenSalvo}`;
          setToken(tokenSalvo);
          setUser(JSON.parse(userSalvo));
        }
      } catch (error) {
        console.warn('Erro ao carregar dados de autenticação:', error);
      } finally {
        setLoading(false);
      }
    }

    carregarSessao();
  }, []);

  const login = async (emailOuDados: string | any, senha?: string) => {
    let novoToken: string;
    let usuario: UsuarioLogado;

    if (typeof emailOuDados === 'string' && senha !== undefined) {
      const response = await api.post('/auth/login', {
        email: emailOuDados,
        senha,
      });
      novoToken = response.data.token;
      usuario = response.data.usuario || response.data.user || response.data;
    } else {
      novoToken = emailOuDados.token;
      usuario = emailOuDados.usuario || emailOuDados.user;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${novoToken}`;

    await setArmazenamento('@HopeEscala:token', novoToken);
    await setArmazenamento('@HopeEscala:user', JSON.stringify(usuario));

    setToken(novoToken);
    setUser(usuario);
  };

  const logout = async () => {
    delete api.defaults.headers.common['Authorization'];
    await removeArmazenamento('@HopeEscala:token');
    await removeArmazenamento('@HopeEscala:user');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (novosDados: Partial<UsuarioLogado>) => {
    if (!user) return;
    const usuarioAtualizado = { ...user, ...novosDados };
    await setArmazenamento('@HopeEscala:user', JSON.stringify(usuarioAtualizado));
    setUser(usuarioAtualizado);
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
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);