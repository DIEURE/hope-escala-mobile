import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://api.hopeescalapro.com.br';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 segundos para acomodar o spin-up do Render
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      // 1. Tenta buscar em todas as chaves comuns do AsyncStorage
      const chaves = ['@hope_token', '@token', '@hope_escala_token', 'token', '@HopeEscala:token'];
      let token: string | null = null;

      for (const k of chaves) {
        token = await AsyncStorage.getItem(k);
        if (token) break;
      }

      // 2. Fallback para Expo Web / localStorage
      if (!token && typeof window !== 'undefined' && window.localStorage) {
        for (const k of chaves) {
          token = window.localStorage.getItem(k);
          if (token) break;
        }
      }

      if (token) {
        const tokenLimpo = token.replace(/^"(.*)"$/, '$1').trim();
        config.headers.set('Authorization', `Bearer ${tokenLimpo}`);
      } else {
        console.warn('⚠️ Requisição enviada sem token JWT:', config.url);
      }
    } catch (e) {
      console.warn('Erro ao carregar token no interceptor:', e);
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);


api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      console.error('🌐 FALHA DE CONEXÃO/REDE:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        mensagem: error.message,
      });
    } else {
      console.error('⚠️ RESPOSTA COM ERRO HTTP:', {
        status: error.response.status,
        url: error.config?.url,
        dados: error.response.data,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
