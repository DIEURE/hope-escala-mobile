import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// DICA: 
// Se for produção/Render: 'https://api.hopeescalapro.com.br' (ou seu subdomínio no Render)
// Se for celular físico no Wi-Fi local: 'http://SEU_IP_LOCAL:8080/api'
// Se for Emulador Android local: 'http://10.0.2.2:8080/api'
const BASE_URL = 'https://api.hopeescalapro.com.br'; // Verifique se esta é a URL exata da sua API

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 segundos (evita Network Error durante o cold start do Render)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor para injetar o JWT automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@hope_token');
      if (token) {
        // Remove possíveis aspas residuais se foi salvo com JSON.stringify
        const tokenLimpo = token.replace(/^"(.*)"$/, '$1').trim();
        config.headers.Authorization = `Bearer ${tokenLimpo}`;
      }
    } catch (e) {
      console.warn('Erro ao carregar token no interceptor:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta com log detalhado de erro de rede
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
