import api from './api';
import { MusicaRepertorio, CultoAgenda } from '../types/escala';

export const mobileDataService = {
  /**
   * Busca as músicas para estudo da escala.
   * Tenta primeiro a playlist manual da escala; se vier vazia, tenta pela playlist vinculada.
   */
  async obterRepertorio(escalaId: number, playlistId?: number | null): Promise<MusicaRepertorio[]> {
    try {
      let dados: any[] = [];

      // 1. Tenta buscar pela rota de playlist manual da escala
      try {
        const respManual = await api.get(`/escalas/${escalaId}/playlist-manual/musicas`);
        if (Array.isArray(respManual.data) && respManual.data.length > 0) {
          dados = respManual.data;
        }
      } catch (err) {
        // Se der 404 ou erro, segue para tentar pela playlistId
      }

      // 2. Se a playlist manual estiver vazia, tenta buscar pela playlist vinculada
      if (dados.length === 0) {
        const idDaPlaylist = playlistId || (await this.obterPlaylistIdDaEscala(escalaId));
        if (idDaPlaylist) {
          try {
            const respPlaylist = await api.get(`/playlists/${idDaPlaylist}/estudo`);
            const listaPlaylist = respPlaylist.data?.musicas || respPlaylist.data;
            if (Array.isArray(listaPlaylist) && listaPlaylist.length > 0) {
              dados = listaPlaylist;
            }
          } catch (err) {
            console.warn(`[Mobile] Não encontrou músicas na playlist #${idDaPlaylist}`);
          }
        }
      }

      if (!Array.isArray(dados) || dados.length === 0) {
        return [];
      }

      // Normaliza os campos para a tela de ensaio
      return dados.map((item: any, index: number) => ({
        id: item.id || item.musicaId || index,
        escalaId: item.escalaId || escalaId,
        nomeMusica: item.nomeMusica || item.titulo || item.nome || 'Sem título',
        cantor: item.cantor || item.artista || item.ministro || 'Ministério de Louvor',
        tom: item.tom || item.tonalidade || '',
        bpm: item.bpm ? Number(item.bpm) : 72,
        ordem: item.ordem ?? index + 1,
        youtubeVideoId: item.youtubeVideoId || item.youtubeUrl || item.linkYoutube || null,
        cifraUrl: item.cifraUrl || item.cifraLink || item.linkCifra || null,
        cifra: item.cifra || item.letra || null,
      }));
    } catch (error) {
      console.error(`[Mobile] Erro ao carregar repertório da escala #${escalaId}:`, error);
      return [];
    }
  },

  /**
   * Obtém os dados da escala para descobrir se ela possui playlistId vinculado
   */
  async obterPlaylistIdDaEscala(escalaId: number): Promise<number | null> {
    try {
      const resp = await api.get(`/escalas/${escalaId}`);
      return resp.data?.playlistId || resp.data?.playlist?.id || null;
    } catch {
      return null;
    }
  },

  /**
   * Lista todas as escalas da congregação (idêntico ao web)
   */
  async listarEscalas(): Promise<any[]> {
    try {
      const res = await api.get('/escalas');
      const lista = Array.isArray(res.data) ? res.data : res.data?.content || [];
      return [...lista].sort((a, b) => Number(b.id) - Number(a.id));
    } catch (err) {
      console.warn('[Mobile] Erro ao listar escalas:', err);
      return [];
    }
  },

  async obterCultosDoMes(mes: number, ano: number): Promise<CultoAgenda[]> {
    try {
      const response = await api.get(`/cultos/agenda?mes=${mes}&ano=${ano}`);
      return response.data || [];
    } catch (error) {
      return [];
    }
  },

  async obterMinhasDatasDisponiveis(mes: number, ano: number): Promise<string[]> {
    try {
      const response = await api.get(`/disponibilidade/minhas-datas?mes=${mes}&ano=${ano}`);
      return response.data || [];
    } catch (error) {
      return [];
    }
  },

  async salvarDisponibilidade(mes: number, ano: number, datas: string[]): Promise<void> {
    await api.post('/disponibilidade', { mes, ano, datas });
  },
};
