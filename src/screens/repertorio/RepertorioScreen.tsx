import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Music2,
  Calendar,
  Video,
  FileText,
  X,
  Sun,
  Moon,
  Disc,
  ListMusic,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';


export interface EscalaResumoDTO {
  id: number;
  data: string;
  tipoCulto: 'MANHA' | 'NOITE' | string;
  nomeCulto?: string;
  ministro?: string;
  urlPlaylist?: string | null;
}

export interface MusicaPlaylistDTO {
  id: number;
  ordem: number;
  titulo: string;
  artista?: string | null;
  tom?: string | null;
  bpm?: number | null;
  linkCifra?: string | null;
  linkYoutube?: string | null;
  observacoes?: string | null;
}

export default function RepertorioScreen() {
  const { user } = useAuth();

  const [escalas, setEscalas] = useState<EscalaResumoDTO[]>([]);
  const [escalaSelecionada, setEscalaSelecionada] = useState<EscalaResumoDTO | null>(null);

  const [musicas, setMusicas] = useState<MusicaPlaylistDTO[]>([]);
  const [carregandoEscalas, setCarregandoEscalas] = useState<boolean>(true);
  const [carregandoMusicas, setCarregandoMusicas] = useState<boolean>(false);
  const [recarregando, setRecarregando] = useState<boolean>(false);

  const [musicaDetalhe, setMusicaDetalhe] = useState<MusicaPlaylistDTO | null>(null);

  // Normaliza o retorno de EscalaMusicaResponseDTO
  const normalizarMusicas = (listaBruta: any[]): MusicaPlaylistDTO[] => {
    if (!Array.isArray(listaBruta)) return [];

    const resultado: MusicaPlaylistDTO[] = listaBruta.map((item: any, idx: number) => {
      const musica = item.musica || item;
      return {
        id: musica.id || item.id || idx + 1,
        ordem: item.ordem ?? item.posicao ?? idx + 1,
        titulo: musica.titulo || musica.nome || item.nomeMusica || 'Louvor sem título',
        artista: musica.artista || musica.cantor || item.artista || 'Artista não informado',
        tom: item.tom || item.tomExecucao || musica.tom || '-',
        bpm: musica.bpm || item.bpm,
        linkCifra: musica.linkCifra || item.linkCifra,
        linkYoutube: musica.linkYoutube || item.linkYoutube || item.urlYoutube,
        observacoes: item.observacoes || item.observacao || musica.observacoes,
      };
    });

    resultado.sort((a, b) => a.ordem - b.ordem);
    return resultado;
  };

  // 1. Carrega as escalas
  const carregarEscalas = useCallback(async () => {
    try {
      setCarregandoEscalas(true);
      let listaBruta: any[] = [];

      // Tenta carregar as escalas do usuário ou escalas gerais
      try {
        const resMinhas = await api.get('/escala-musicos/minhas-escalas');
        if (Array.isArray(resMinhas.data) && resMinhas.data.length > 0) {
          listaBruta = resMinhas.data;
        }
      } catch {}

      if (listaBruta.length === 0) {
        try {
          const resGerais = await api.get('/escalas');
          listaBruta = Array.isArray(resGerais.data) ? resGerais.data : resGerais.data?.content || [];
        } catch {}
      }

      const mapa = new Map<number, EscalaResumoDTO>();

      listaBruta.forEach((item: any) => {
        const id = item.escalaId || item.id;
        if (!id) return;

        if (!mapa.has(id)) {
          mapa.set(id, {
            id,
            data: item.data || item.dataCulto || '',
            tipoCulto: item.tipoCulto || (item.periodo === 'MANHA' ? 'MANHA' : 'NOITE'),
            nomeCulto: item.nomeCulto || (item.tipoCulto === 'MANHA' ? 'Culto Matutino' : 'Culto Noturno'),
            ministro: item.ministro || item.nomeMinistro,
            urlPlaylist: item.urlPlaylist,
          });
        }
      });

      const listaFinal = Array.from(mapa.values());
      listaFinal.sort((a, b) => a.data.localeCompare(b.data));

      setEscalas(listaFinal);

      if (listaFinal.length > 0) {
        setEscalaSelecionada(listaFinal[0]);
      }
    } catch (err) {
      console.warn('Erro ao carregar lista de escalas:', err);
      setEscalas([]);
    } finally {
      setCarregandoEscalas(false);
      setRecarregando(false);
    }
  }, []);

  // 2. Busca músicas da escala selecionada
  const carregarMusicasDaEscala = useCallback(async (idEscala: number) => {
    try {
      setCarregandoMusicas(true);
      let dadosMusicas: any[] = [];

      // 🟢 Rota principal: GET /escalas/{id}/playlist-manual/musicas
      try {
        const res = await api.get(`/escalas/${idEscala}/playlist-manual/musicas`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          dadosMusicas = res.data;
        }
      } catch {}

      // Fallback 1: GET /escalas/{id}/musicas
      if (dadosMusicas.length === 0) {
        try {
          const resAlias = await api.get(`/escalas/${idEscala}/musicas`);
          if (Array.isArray(resAlias.data) && resAlias.data.length > 0) {
            dadosMusicas = resAlias.data;
          }
        } catch {}
      }

      // Fallback 2: GET /escalas/{id}/detalhes
      if (dadosMusicas.length === 0) {
        try {
          const resDet = await api.get(`/escalas/${idEscala}/detalhes`);
          if (resDet.data?.musicas) {
            dadosMusicas = resDet.data.musicas;
          } else if (resDet.data?.playlist?.itens) {
            dadosMusicas = resDet.data.playlist.itens;
          }
        } catch {}
      }

      setMusicas(normalizarMusicas(dadosMusicas));
    } catch (err) {
      console.warn(`Erro ao carregar músicas da escala ${idEscala}:`, err);
      setMusicas([]);
    } finally {
      setCarregandoMusicas(false);
    }
  }, []);

  useEffect(() => {
    carregarEscalas();
  }, [carregarEscalas]);

  useEffect(() => {
    if (escalaSelecionada) {
      carregarMusicasDaEscala(escalaSelecionada.id);
    }
  }, [escalaSelecionada, carregarMusicasDaEscala]);

  const onRefresh = () => {
    setRecarregando(true);
    carregarEscalas();
    if (escalaSelecionada) {
      carregarMusicasDaEscala(escalaSelecionada.id);
    }
  };

  const formatarData = (dataStr?: string) => {
    if (!dataStr) return '--/--';
    const partes = dataStr.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
    return dataStr;
  };

  const abrirLinkExterno = async (url?: string | null) => {
    if (!url) return;
    try {
      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else if (Platform.OS === 'web') {
        window.open(url, '_blank');
      }
    } catch (e) {
      console.warn('Erro ao abrir link externo:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Repertório da Escala</Text>
        <Text style={styles.headerSubtitulo}>
          Músicas cadastradas para os cultos dominicais
        </Text>
      </View>

      {/* SELETOR DE CULTOS */}
      <View style={styles.seletorContainer}>
        <Text style={styles.seletorLabel}>Escolha o Culto Dominical:</Text>
        {carregandoEscalas ? (
          <ActivityIndicator size="small" color="#FF6B00" style={{ marginVertical: 8 }} />
        ) : escalas.length === 0 ? (
          <Text style={styles.avisoVazio}>Nenhum culto com escala encontrado.</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollEscalas}
          >
            {escalas.map((item) => {
              const selecionada = item.id === escalaSelecionada?.id;
              const isManha = item.tipoCulto === 'MANHA';

              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={[styles.chipCulto, selecionada && styles.chipCultoAtivo]}
                  onPress={() => setEscalaSelecionada(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chipRow}>
                    {isManha ? (
                      <Sun size={13} color={selecionada ? '#ffffff' : '#ea580c'} />
                    ) : (
                      <Moon size={13} color={selecionada ? '#ffffff' : '#FF6B00'} />
                    )}
                    <Text style={[styles.chipData, selecionada && styles.chipTextoBranco]}>
                      {formatarData(item.data)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.chipCultoNome, selecionada && styles.chipTextoBranco]}
                    numberOfLines={1}
                  >
                    {isManha ? 'Culto Manhã' : 'Culto Noite'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* BANNER DO CULTO SELECIONADO */}
      {escalaSelecionada && (
        <View style={styles.bannerInfo}>
          <View style={styles.bannerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.bannerTituloRow}>
                <ListMusic size={15} color="#FF6B00" />
                <Text style={styles.bannerPlaylistNome}>
                  Repertório Dominical
                </Text>
              </View>
              <Text style={styles.bannerSub}>
                Domingo, {formatarData(escalaSelecionada.data)} • {escalaSelecionada.nomeCulto}
              </Text>
            </View>

            {Boolean(escalaSelecionada.urlPlaylist) && (
              <TouchableOpacity
                style={styles.btnYoutubePlaylist}
                onPress={() => abrirLinkExterno(escalaSelecionada.urlPlaylist)}
              >
                <Video size={14} color="#ffffff" />
                <Text style={styles.btnYoutubeTexto}>Playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* LISTAGEM DAS MÚSICAS */}
      {carregandoMusicas ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoTexto}>Carregando repertório...</Text>
        </View>
      ) : (
        <FlatList
          data={musicas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardMusica}
              activeOpacity={0.8}
              onPress={() => setMusicaDetalhe(item)}
            >
              <View style={styles.cardEsquerda}>
                <View style={styles.ordemBox}>
                  <Text style={styles.ordemTexto}>{item.ordem}º</Text>
                </View>
                <View style={styles.infoMusica}>
                  <Text style={styles.tituloMusica} numberOfLines={1}>
                    {item.titulo}
                  </Text>
                  <Text style={styles.artistaMusica} numberOfLines={1}>
                    {item.artista}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDireita}>
                <View style={styles.tomBadge}>
                  <Text style={styles.tomLabel}>Tom:</Text>
                  <Text style={styles.tomValor}>{item.tom}</Text>
                </View>

                <View style={styles.botoesAcaoRow}>
                  {Boolean(item.linkYoutube) && (
                    <TouchableOpacity
                      onPress={() => abrirLinkExterno(item.linkYoutube)}
                      style={styles.btnIconeAcao}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Video size={17} color="#ef4444" />
                    </TouchableOpacity>
                  )}

                  {Boolean(item.linkCifra) && (
                    <TouchableOpacity
                      onPress={() => abrirLinkExterno(item.linkCifra)}
                      style={styles.btnIconeAcao}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <FileText size={17} color="#FF6B00" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Disc size={44} color="#334155" />
              <Text style={styles.emptyTitulo}>Nenhum louvor na playlist</Text>
              <Text style={styles.emptySubtitulo}>
                As músicas deste culto ainda não foram adicionadas pelo ministro responsável.
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL DETALHE DA MÚSICA */}
      <Modal
        visible={Boolean(musicaDetalhe)}
        transparent
        animationType="fade"
        onRequestClose={() => setMusicaDetalhe(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOrdemBadge}>
                  {musicaDetalhe?.ordem}ª Música da Escala
                </Text>
                <Text style={styles.modalTitulo}>{musicaDetalhe?.titulo}</Text>
                <Text style={styles.modalArtista}>{musicaDetalhe?.artista}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setMusicaDetalhe(null)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalCorpo}>
              <View style={styles.linhaDestaqueTom}>
                <Text style={styles.modalLabel}>Tom Definido:</Text>
                <Text style={styles.tomGrande}>{musicaDetalhe?.tom}</Text>
              </View>

              {Boolean(musicaDetalhe?.bpm) && (
                <View style={styles.modalLinhaInfo}>
                  <Text style={styles.modalLabel}>Andamento:</Text>
                  <Text style={styles.modalValor}>{musicaDetalhe?.bpm} BPM</Text>
                </View>
              )}

              {Boolean(musicaDetalhe?.observacoes) && (
                <View style={styles.obsBox}>
                  <Text style={styles.obsLabel}>Observações:</Text>
                  <Text style={styles.obsTexto}>{musicaDetalhe?.observacoes}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalBotoes}>
              {Boolean(musicaDetalhe?.linkCifra) && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCifra]}
                  onPress={() => abrirLinkExterno(musicaDetalhe?.linkCifra)}
                >
                  <FileText size={16} color="#ffffff" />
                  <Text style={styles.modalBtnTexto}>Abrir Cifra</Text>
                </TouchableOpacity>
              )}

              {Boolean(musicaDetalhe?.linkYoutube) && (
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnYoutube]}
                  onPress={() => abrirLinkExterno(musicaDetalhe?.linkYoutube)}
                >
                  <Video size={16} color="#ffffff" />
                  <Text style={styles.modalBtnTexto}>YouTube</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSubtitulo: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  seletorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  seletorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scrollEscalas: {
    paddingHorizontal: 16,
    gap: 8,
  },
  avisoVazio: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 16,
  },
  chipCulto: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 110,
  },
  chipCultoAtivo: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipData: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  chipCultoNome: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  chipTextoBranco: {
    color: '#ffffff',
  },
  bannerInfo: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  bannerTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerPlaylistNome: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  bannerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  btnYoutubePlaylist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnYoutubeTexto: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carregandoTexto: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 13,
  },
  cardMusica: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ordemBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordemTexto: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '900',
  },
  infoMusica: {
    flex: 1,
  },
  tituloMusica: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  artistaMusica: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },
  cardDireita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tomLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  tomValor: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF6B00',
  },
  botoesAcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnIconeAcao: {
    padding: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 14,
  },
  emptySubtitulo: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalOrdemBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B00',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalArtista: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCorpo: {
    gap: 12,
    marginBottom: 16,
  },
  linhaDestaqueTom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  tomGrande: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
  },
  modalLinhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  modalValor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  obsBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  obsLabel: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
    marginBottom: 4,
  },
  obsTexto: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  modalBotoes: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
  },
  modalBtnCifra: {
    backgroundColor: '#FF6B00',
  },
  modalBtnYoutube: {
    backgroundColor: '#b91c1c',
  },
  modalBtnTexto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
