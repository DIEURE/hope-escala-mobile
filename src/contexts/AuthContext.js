import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarSessao() {
      try {
        const [tokenArmazenado, userArmazenado] = await AsyncStorage.multiGet([
          'token',
          'usuario',
        ]);

        if (tokenArmazenado[1] && userArmazenado[1]) {
          setUser(JSON.parse(userArmazenado[1]));
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarSessao();
  }, []);

  const login = async (email, senha) => {
    // Rota confirmada: /auth/login
    // Payload confirmado: { email, senha }
    const response = await api.post('/auth/login', {
      email: email.trim(),
      senha: senha,
    });

    // Desestrutura os dados exatamente como seu LoginResponseDTO devolve
    const { token, nome, email: userEmail, perfil, empresaId, nomeEmpresa } = response.data;

    const usuarioFormatado = {
      nome,
      email: userEmail,
      perfil,
      empresaId,
      nomeEmpresa,
    };

    // Salva com as mesmas chaves que o api.js e o frontend Web utilizam
    await AsyncStorage.multiSet([
      ['token', token],
      ['usuario', JSON.stringify(usuarioFormatado)],
    ]);

    setUser(usuarioFormatado);
    return usuarioFormatado;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'usuario']);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
