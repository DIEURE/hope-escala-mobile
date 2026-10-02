import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Play,
  Pause,
  Clock,
  Layers,
  FileText,
  Video,
  Music,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Check,
  Edit3,
  X,
  Save,
  Minus,
  Plus,
  Calendar,
} from 'lucide-react-native';
import { mobileDataService } from '../../services/mobileDataService';
import { MusicaRepertorio } from '../../types/escala';
import { transporTextoCifra, transporNota } from '../../utils/cifraUtils';

export default function SalaEnsaioScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // ID da escala recebido diretamente do clique na tela inicial
  const escalaIdParam = route.params?.escalaId ? Number(route.params.escalaId) : null;

  const [escalasDisponiveis, setEscalasDisponiveis] = useState<any[]>([]);
  const [escalaSelecionadaId, setEscalaSelecionadaId] = useState<number | null>(escalaIdParam);
  const [escalaAtualInfo, setEscalaAtualInfo] = useState<any | null>(null);

  const [musicas, setMusicas] = useState<MusicaRepertorio[]>([]);
  const [musicaAtiva, setMusicaAtiva] = useState<MusicaRepertorio | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [carregandoMusicas, setCarregandoMusicas] = useState<boolean>(false);
  const [modoReordenar, setModoReordenar] = useState<boolean>(false);

  // Estados de Transposição (+ / - tom)
  const [semitonsOffset, setSemitonsOffset] = useState<number>(0);

  // Estados de Edição da Cifra
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState<boolean>(false);
  const [textoCifraEditavel, setTextoCifraEditavel] = useState<string>('');
  const [tomEditavel, setTomEditavel] = useState<string>('');
  const [salvandoCifra, setSalvandoCifra] = useState<boolean>(false);

  // Metrônomo
  const [clickAtivo, setClickAtivo] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(72);
  const [tempoAtual, setTempoAtual] = useState<number>(0);
  const beatsPorCompasso = 4;
  const audioCtxRef = useRef<any>(null);
  const timerMetronomo = useRef<any>(null);

  // Formatação de data e nome do culto
  const formatarRotuloEscala = (esc: any) => {
    if (!esc) return 'Culto';

    const dataBruta = esc.data || esc.dataCulto || esc.dataEscala || esc.dataHora;
    let dataFormatada = '';

    if (dataBruta) {
      const partes = String(dataBruta).split('T')[0].split('-');
      if (partes.length === 3) {
        dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
      } else {
        dataFormatada = String(dataBruta);
      }
    }

    const nomeCulto =
      esc.nomeCulto ||
      esc.nomeCultoNoite ||
      esc.nomeCultoManha ||
      (esc.tipoCulto === 'MANHA' ? 'Culto Matutino' : esc.tipoCulto === 'NOITE' ? 'Culto Noturno' : null) ||
      esc.evento ||
      esc.departamentoNome ||
      `Culto #${esc.id}`;

    return dataFormatada ? `${dataFormatada} • ${nomeCulto}` : `${nomeCulto} (#${esc.id})`;
  };

  // Carrega escalas e resolve a escala ativa
  useEffect(() => {
    async function carregarEscalas() {
      try {
        setCarregando(true);
        const lista = await mobileDataService.listarEscalas();
        setEscalasDisponiveis(lista);

        const idAlvo = escalaIdParam ?? (lista.length > 0 ? Number(lista[0].id) : null);
        setEscalaSelecionadaId(idAlvo);

        if (idAlvo) {
          const encontrada = lista.find((item: any) => Number(item.id) === Number(idAlvo));
          setEscalaAtualInfo(encontrada || null);
        }
      } catch (err) {
        console.warn('Erro ao carregar lista de escalas:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregarEscalas();
  }, [escalaIdParam]);

  // Carrega repertório da escala ativa
  const carregarRepertorio = useCallback(async (idEscala: number) => {
    try {
      setCarregandoMusicas(true);
      const dados = await mobileDataService.obterRepertorio(idEscala);

      setMusicas(dados);
      if (dados.length > 0) {
        setMusicaAtiva(dados[0]);
        setBpm(Number(dados[0].bpm) || 72);
      } else {
        setMusicaAtiva(null);
      }
    } catch (err) {
      console.error('[SalaEnsaio] Erro ao obter repertório:', err);
      setMusicas([]);
      setMusicaAtiva(null);
    } finally {
      setCarregandoMusicas(false);
    }
  }, []);

  useEffect(() => {
    if (escalaSelecionadaId) {
      const encontrada = escalasDisponiveis.find((item: any) => Number(item.id) === Number(escalaSelecionadaId));
      if (encontrada) setEscalaAtualInfo(encontrada);
      carregarRepertorio(escalaSelecionadaId);
    }
  }, [escalaSelecionadaId, escalasDisponiveis, carregarRepertorio]);

  // Reseta offset de tom e BPM ao alterar de faixa
  useEffect(() => {
    if (musicaAtiva) {
      setBpm(Number(musicaAtiva.bpm) || 72);
      setClickAtivo(false);
      setSemitonsOffset(0);
    }
  }, [musicaAtiva]);

  // Transposição dinâmica
  const cifraExibida = useMemo(() => {
    if (!musicaAtiva?.cifra) return '';
    return transporTextoCifra(musicaAtiva.cifra, semitonsOffset);
  }, [musicaAtiva?.cifra, semitonsOffset]);

  const tomExibido = useMemo(() => {
    if (!musicaAtiva?.tom) return 'N/A';
    return semitonsOffset === 0
      ? musicaAtiva.tom
      : transporNota(musicaAtiva.tom, semitonsOffset);
  }, [musicaAtiva?.tom, semitonsOffset]);

  // Abrir editor de cifra
  const abrirEditorCifra = () => {
    if (!musicaAtiva) return;
    setTextoCifraEditavel(musicaAtiva.cifra || '');
    setTomEditavel(musicaAtiva.tom || '');
    setModalEdicaoVisivel(true);
  };

  // Salvar edição
  const salvarEdicaoCifra = async () => {
    if (!musicaAtiva) return;
    try {
      setSalvandoCifra(true);

      if (typeof (mobileDataService as any).atualizarCifra === 'function') {
        await (mobileDataService as any).atualizarCifra(
          musicaAtiva.id,
          textoCifraEditavel,
          tomEditavel
        );
      }

      const musicaAtualizada = {
        ...musicaAtiva,
        cifra: textoCifraEditavel,
        tom: tomEditavel.trim().toUpperCase(),
      };
      setMusicaAtiva(musicaAtualizada);

      setMusicas((prev) =>
        prev.map((m) => (m.id === musicaAtualizada.id ? musicaAtualizada : m))
      );

      setSemitonsOffset(0);
      setModalEdicaoVisivel(false);
    } catch (error) {
      console.error('Erro ao salvar cifra:', error);
      Alert.alert('Erro', 'Não foi possível salvar a cifra. Verifique a conexão e tente novamente.');
    } finally {
      setSalvandoCifra(false);
    }
  };

  // Reordenação de faixas
  const moverMusica = (index: number, direcao: 'cima' | 'baixo') => {
    const novoIndex = direcao === 'cima' ? index - 1 : index + 1;
    if (novoIndex < 0 || novoIndex >= musicas.length) return;

    const novaLista = [...musicas];
    const [itemMovido] = novaLista.splice(index, 1);
    novaLista.splice(novoIndex, 0, itemMovido);

    const listaReordenada = novaLista.map((m, idx) => ({
      ...m,
      ordem: idx + 1,
    }));

    setMusicas(listaReordenada);
  };

  // Metrônomo Web/Mobile
  const tocarBeep = (isForte: boolean) => {
    if (Platform.OS === 'web') {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = isForte ? 1200 : 800;
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (clickAtivo) {
      const intervaloMs = (60 / Math.max(30, bpm)) * 1000;
      timerMetronomo.current = setInterval(() => {
        setTempoAtual((prev) => {
          const prox = (prev + 1) % beatsPorCompasso;
          tocarBeep(prox === 0);
          return prox;
        });
      }, intervaloMs);
    } else {
      if (timerMetronomo.current) clearInterval(timerMetronomo.current);
      setTempoAtual(0);
    }

    return () => {
      if (timerMetronomo.current) clearInterval(timerMetronomo.current);
    };
  }, [clickAtivo, bpm]);

  const abrirLinkExterno = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  const abrirYoutube = (linkOuId?: string | null) => {
    if (!linkOuId) return;
    const raw = String(linkOuId).trim();
    if (raw.includes('${') || raw.length < 5) return;

    let urlFinal = raw;
    if (raw.includes('youtu.be/')) {
      const match = raw.split('youtu.be/')[1]?.split('?')[0];
      urlFinal = match ? `https://www.youtube.com/watch?v=${match}` : raw;
    } else if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      const cleanId = raw.replace(/[^a-zA-Z0-9_-]/g, '');
      urlFinal = `https://www.youtube.com/watch?v=${cleanId}`;
    }

    Linking.openURL(urlFinal).catch(() => {});
  };

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.textoCarregando}>Carregando sala de ensaio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.btnVoltar}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextos}>
            <Text style={styles.subtituloLaranja}>ESTUDO DE REPERTÓRIO</Text>
            <Text style={styles.titulo}>Sala de Ensaio</Text>
          </View>
        </View>

        {/* SE RECEBEU A ESCALA POR PARÂMETRO DA HOME: EXIBE APENAS O BADGE FIXO DO CULTO */}
        {escalaIdParam && escalaAtualInfo ? (
          <View style={styles.badgeEscalaFixa}>
            <Calendar size={13} color="#FF6B00" />
            <Text style={styles.badgeEscalaFixaTexto}>
              {formatarRotuloEscala(escalaAtualInfo)}
            </Text>
          </View>
        ) : (
          /* SE ENTROU SEM PARÂMETRO: MOSTRA SELETOR HORIZONTAL */
          escalasDisponiveis.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.escalasSelector}
            >
              {escalasDisponiveis.map((esc) => {
                const ativo = Number(esc.id) === Number(escalaSelecionadaId);
                const label = formatarRotuloEscala(esc);

                return (
                  <TouchableOpacity
                    key={esc.id}
                    style={[styles.chipEscala, ativo && styles.chipEscalaAtivo]}
                    onPress={() => setEscalaSelecionadaId(Number(esc.id))}
                  >
                    <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )
        )}
      </View>

      {carregandoMusicas ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.textoCarregando}>Buscando faixas do repertório...</Text>
        </View>
      ) : musicas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.iconCircle}>
            <Music size={28} color="#FF6B00" />
          </View>
          <Text style={styles.emptyTitulo}>Nenhuma música na playlist</Text>
          <Text style={styles.emptySubtitulo}>
            Esta escala ainda não possui músicas vinculadas.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.conteudo} showsVerticalScrollIndicator={false}>
          {/* SEÇÃO DO REPERTÓRIO */}
          <View style={styles.secao}>
            <View style={styles.secaoHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Layers size={16} color="#FF6B00" />
                <Text style={styles.secaoTitulo}>Músicas do Culto ({musicas.length})</Text>
              </View>

              <TouchableOpacity
                style={[styles.btnReordenar, modoReordenar && styles.btnReordenarAtivo]}
                onPress={() => setModoReordenar(!modoReordenar)}
                activeOpacity={0.8}
              >
                {modoReordenar ? (
                  <>
                    <Check size={14} color="#ffffff" />
                    <Text style={styles.btnReordenarTexto}>Concluir</Text>
                  </>
                ) : (
                  <>
                    <ArrowUpDown size={14} color="#FF6B00" />
                    <Text style={[styles.btnReordenarTexto, { color: '#FF6B00' }]}>Reordenar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {modoReordenar ? (
              <View style={styles.painelReordenar}>
                <Text style={styles.reordenarDica}>
                  Use as setas para ajustar a sequência das músicas para este ensaio:
                </Text>
                {musicas.map((m, idx) => (
                  <View key={m.id || idx} style={styles.itemReordenar}>
                    <View style={styles.itemReordenarBadge}>
                      <Text style={styles.itemReordenarNum}>#{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={styles.itemReordenarNome} numberOfLines={1}>
                        {m.nomeMusica}
                      </Text>
                      <Text style={styles.itemReordenarTom}>
                        Tom: {m.tom || 'N/D'} • {m.cantor}
                      </Text>
                    </View>
                    <View style={styles.botoesMover}>
                      <TouchableOpacity
                        style={[styles.btnSetaMover, idx === 0 && styles.btnSetaDesativada]}
                        disabled={idx === 0}
                        onPress={() => moverMusica(idx, 'cima')}
                      >
                        <ChevronUp size={16} color={idx === 0 ? '#475569' : '#ffffff'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.btnSetaMover,
                          idx === musicas.length - 1 && styles.btnSetaDesativada,
                        ]}
                        disabled={idx === musicas.length - 1}
                        onPress={() => moverMusica(idx, 'baixo')}
                      >
                        <ChevronDown
                          size={16}
                          color={idx === musicas.length - 1 ? '#475569' : '#ffffff'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listaHorizontal}>
                {musicas.map((m, idx) => {
                  const isSelected = musicaAtiva?.id === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id || idx}
                      style={[styles.cardMusicaMini, isSelected && styles.cardMusicaMiniAtivo]}
                      onPress={() => setMusicaAtiva(m)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.numeroOrdem, isSelected && { color: '#FF6B00' }]}>
                        #{m.ordem || idx + 1}
                      </Text>
                      <Text style={styles.miniTitulo} numberOfLines={1}>
                        {m.nomeMusica}
                      </Text>
                      <Text style={styles.miniTom}>Tom: {m.tom || 'N/D'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* DETALHES DA MÚSICA SELECIONADA */}
          {musicaAtiva && !modoReordenar && (
            <View style={styles.cardPrincipal}>
              <View style={styles.musicaHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelEmReproducao}>ESTUDANDO AGORA</Text>
                  <Text style={styles.musicaNome}>{musicaAtiva.nomeMusica}</Text>
                  <Text style={styles.musicaCantor}>{musicaAtiva.cantor}</Text>
                </View>

                <View style={styles.badgeTom}>
                  <Text style={styles.badgeTomLabel}>TOM</Text>
                  <Text style={styles.badgeTomValor}>{tomExibido}</Text>
                </View>
              </View>

              {/* METRÔNOMO */}
              <View style={styles.blocoMetronomo}>
                <View style={styles.metronomoHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} color="#FF6B00" />
                    <Text style={styles.blocoTitulo}>Metrônomo ({bpm} BPM)</Text>
                  </View>

                  <View style={styles.bolinhasCompasso}>
                    {[0, 1, 2, 3].map((b) => (
                      <View
                        key={b}
                        style={[
                          styles.bolinha,
                          clickAtivo &&
                            tempoAtual === b &&
                            (b === 0 ? styles.bolinhaForte : styles.bolinhaFraca),
                        ]}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.metronomoAcoes}>
                  <TouchableOpacity
                    style={[styles.btnPlayClick, clickAtivo && styles.btnPlayClickAtivo]}
                    onPress={() => setClickAtivo(!clickAtivo)}
                    activeOpacity={0.8}
                  >
                    {clickAtivo ? <Pause size={16} color="#fff" /> : <Play size={16} color="#fff" />}
                    <Text style={styles.btnPlayTexto}>
                      {clickAtivo ? 'Parar Click' : 'Iniciar Click'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.bpmBotoes}>
                    <TouchableOpacity
                      style={styles.btnBpmAjuste}
                      onPress={() => setBpm((p) => Math.max(30, p - 2))}
                    >
                      <Text style={styles.btnBpmTexto}>-2</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnBpmAjuste}
                      onPress={() => setBpm((p) => Math.min(260, p + 2))}
                    >
                      <Text style={styles.btnBpmTexto}>+2</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* VÍDEO DO YOUTUBE */}
              {Boolean(musicaAtiva.youtubeVideoId) && (
                <TouchableOpacity
                  style={styles.btnYoutube}
                  onPress={() => abrirYoutube(musicaAtiva.youtubeVideoId)}
                  activeOpacity={0.8}
                >
                  <Video size={18} color="#ef4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ytTitulo}>Vídeo Oficial de Referência</Text>
                    <Text style={styles.ytSub}>Abrir versão vinculada para o ensaio</Text>
                  </View>
                  <ExternalLink size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {/* CIFRA */}
              <View style={styles.blocoCifra}>
                <View style={styles.cifraHeader}>
                  <View style={styles.cifraHeaderTitulo}>
                    <FileText size={16} color="#FF6B00" />
                    <Text style={styles.blocoTitulo}>Cifra & Letra</Text>
                  </View>

                  <View style={styles.cifraControles}>
                    {/* Botões de Mudar Tom */}
                    <View style={styles.barraTom}>
                      <TouchableOpacity
                        style={styles.btnAjusteTom}
                        onPress={() => setSemitonsOffset((prev) => prev - 1)}
                        activeOpacity={0.7}
                      >
                        <Minus size={13} color="#ffffff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setSemitonsOffset(0)}
                        disabled={semitonsOffset === 0}
                        style={[
                          styles.badgeOffsetTom,
                          semitonsOffset !== 0 && styles.badgeOffsetTomAtivo,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.textoOffsetTom,
                            semitonsOffset !== 0 && styles.textoOffsetTomAtivo,
                          ]}
                        >
                          {semitonsOffset > 0 ? `+${semitonsOffset}` : semitonsOffset}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.btnAjusteTom}
                        onPress={() => setSemitonsOffset((prev) => prev + 1)}
                        activeOpacity={0.7}
                      >
                        <Plus size={13} color="#ffffff" />
                      </TouchableOpacity>
                    </View>

                    {/* Botão de Editar Cifra */}
                    <TouchableOpacity
                      onPress={abrirEditorCifra}
                      style={styles.btnEditarCifra}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={12} color="#ffffff" />
                      <Text style={styles.btnEditarCifraTexto}>Editar</Text>
                    </TouchableOpacity>

                    {Boolean(musicaAtiva.cifraUrl) && (
                      <TouchableOpacity
                        onPress={() => abrirLinkExterno(musicaAtiva.cifraUrl)}
                        style={styles.btnCifraExterna}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.btnCifraExternaTexto}>Externa</Text>
                        <ExternalLink size={12} color="#FF6B00" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {cifraExibida ? (
                  <View style={styles.caixaTextoCifra}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={true}
                      contentContainerStyle={styles.cifraScrollContainer}
                    >
                      <Text style={styles.textoCifra}>
                        {cifraExibida}
                      </Text>
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.cifraVaziaContainer}>
                    <Text style={styles.cifraVaziaTexto}>
                      Nenhuma cifra salva para esta música.
                    </Text>
                    <TouchableOpacity
                      style={styles.btnAdicionarCifra}
                      onPress={abrirEditorCifra}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={14} color="#FF6B00" />
                      <Text style={styles.btnAdicionarCifraTexto}>Adicionar Cifra Agora</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* MODAL PARA EDITAR CIFRA */}
      <Modal
        visible={modalEdicaoVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEdicaoVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitulo}>Editar Cifra</Text>
                <Text style={styles.modalSubtitulo} numberOfLines={1}>
                  {musicaAtiva?.nomeMusica}
                </Text>
              </View>

              <View style={styles.modalTomContainer}>
                <Text style={styles.modalTomLabel}>Tom:</Text>
                <TextInput
                  style={styles.modalTomInput}
                  value={tomEditavel}
                  onChangeText={setTomEditavel}
                  placeholder="Ex: G"
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                  maxLength={4}
                />
              </View>

              <TouchableOpacity
                style={styles.btnFecharModal}
                onPress={() => setModalEdicaoVisivel(false)}
              >
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalCorpo}>
              <TextInput
                style={styles.modalInputArea}
                multiline
                value={textoCifraEditavel}
                onChangeText={setTextoCifraEditavel}
                placeholder="Cole ou digite a cifra respeitando os alinhamentos..."
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnModalCancelar}
                onPress={() => setModalEdicaoVisivel(false)}
                disabled={salvandoCifra}
              >
                <Text style={styles.btnModalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnModalSalvar, salvandoCifra && { opacity: 0.6 }]}
                onPress={salvarEdicaoCifra}
                disabled={salvandoCifra}
              >
                {salvandoCifra ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Save size={15} color="#ffffff" />
                    <Text style={styles.btnModalSalvarTexto}>Salvar Alterações</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCarregando: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnVoltar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTextos: {
    flex: 1,
  },
  subtituloLaranja: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  badgeEscalaFixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  badgeEscalaFixaTexto: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '700',
  },
  escalasSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingBottom: 4,
  },
  chipEscala: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipEscalaAtivo: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  chipTexto: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextoAtivo: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  conteudo: {
    flex: 1,
    padding: 16,
  },
  secao: {
    marginBottom: 16,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  secaoTitulo: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnReordenar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  btnReordenarAtivo: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  btnReordenarTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  painelReordenar: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  reordenarDica: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  itemReordenar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemReordenarBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemReordenarNum: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B00',
  },
  itemReordenarNome: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemReordenarTom: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  botoesMover: {
    flexDirection: 'row',
    gap: 4,
  },
  btnSetaMover: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSetaDesativada: {
    opacity: 0.3,
  },
  listaHorizontal: {
    flexDirection: 'row',
  },
  cardMusicaMini: {
    width: 140,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardMusicaMiniAtivo: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  numeroOrdem: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 4,
  },
  miniTitulo: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  miniTom: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  cardPrincipal: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
    marginBottom: 40,
  },
  musicaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 14,
  },
  labelEmReproducao: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  musicaNome: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  musicaCantor: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgeTom: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeTomLabel: {
    fontSize: 9,
    color: '#FF6B00',
    fontWeight: '800',
  },
  badgeTomValor: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  blocoMetronomo: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  metronomoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blocoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  bolinhasCompasso: {
    flexDirection: 'row',
    gap: 6,
  },
  bolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
  },
  bolinhaForte: {
    backgroundColor: '#FF6B00',
    transform: [{ scale: 1.2 }],
  },
  bolinhaFraca: {
    backgroundColor: '#f59e0b',
  },
  metronomoAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnPlayClick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnPlayClickAtivo: {
    backgroundColor: '#e11d48',
  },
  btnPlayTexto: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  bpmBotoes: {
    flexDirection: 'row',
    gap: 6,
  },
  btnBpmAjuste: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnBpmTexto: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  btnYoutube: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 12,
  },
  ytTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f87171',
  },
  ytSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  blocoCifra: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  cifraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  cifraHeaderTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cifraControles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barraTom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2,
  },
  btnAjusteTom: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#0f172a',
  },
  badgeOffsetTom: {
    paddingHorizontal: 7,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOffsetTomAtivo: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderRadius: 4,
  },
  textoOffsetTom: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
  },
  textoOffsetTomAtivo: {
    color: '#FF6B00',
  },
  btnEditarCifra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  btnEditarCifraTexto: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  btnCifraExterna: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  btnCifraExternaTexto: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '700',
  },
  caixaTextoCifra: {
    backgroundColor: '#090d16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  cifraScrollContainer: {
    minWidth: '100%',
  },
  textoCifra: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 22,
    textAlign: 'left',
  },
  cifraVaziaContainer: {
    backgroundColor: '#090d16',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  cifraVaziaTexto: {
    color: '#64748b',
    fontSize: 13,
  },
  btnAdicionarCifra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  btnAdicionarCifraTexto: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySubtitulo: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitulo: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalTomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTomLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '700',
  },
  modalTomInput: {
    backgroundColor: '#1e293b',
    color: '#FF6B00',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 42,
  },
  btnFecharModal: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  modalCorpo: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 12,
  },
  modalInputArea: {
    flex: 1,
    color: '#e2e8f0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  btnModalCancelar: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnModalCancelarTexto: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  btnModalSalvar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
  },
  btnModalSalvarTexto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
