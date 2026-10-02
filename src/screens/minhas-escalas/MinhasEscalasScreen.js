import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar,
  Clock,
  Music,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  PlaySquare,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function MinhasEscalasScreen() {
  const { user, logout } = useAuth();

  const [escalas, setEscalas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [recarregando, setRecarregando] = useState(false);

  // Estados modal recusa
  const [modalRecusaVisivel, setModalRecusaVisivel] = useState(false);
  const [escalaSelecionadaId, setEscalaSelecionadaId] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const [enviandoAcao, setEnviandoAcao] = useState(false);

  // Estados modal repertorio
  const [modalRepertorioVisivel, setModalRepertorioVisivel] = useState(false);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [repertorioAtual, setRepertorioAtual] = useState([]);
  const [tituloRepertorio, setTituloRepertorio] = useState('');
  const [playlistUrlAtual, setPlaylistUrlAtual] = useState(null);

  const formatarData = (dataStr) => {
    if (!dataStr) return 'Domingo';
    const partes = String(dataStr).split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return String(dataStr);
  };

  const formatarHora = (horaStr) => {
    if (!horaStr) return '';
    return String(horaStr).substring(0, 5);
  };

  // 🟢 Chamando o endpoint exclusivo do voluntário logado
  const buscarEscalas = useCallback(async () => {
    try {
      const response = await api.get('/escala-musicos/minhas-escalas');
      const dados = Array.isArray(response.data) ? response.data : [];
      setEscalas(dados);
    } catch (error) {
      console.error('Erro ao buscar minhas escalas:', error);
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarEscalas();
  }, [buscarEscalas]);

  const onRefresh = () => {
    setRecarregando(true);
    buscarEscalas();
  };

  const handleConfirmar = (escalaId) => {
    Alert.alert(
      'Confirmar Presença',
      'Confirma sua participação nesta escala de domingo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setEnviandoAcao(true);
              // 🟢 Endpoint próprio para confirmação do músico logado
              await api.patch(`/escala-musicos/minhas-escalas/${escalaId}/confirmacao`, {
                confirmado: true,
              });
              Alert.alert('Sucesso', 'Sua presença foi confirmada!');
              buscarEscalas();
            } catch (err) {
              const msg =
                err.response?.data?.message ||
                err.response?.data?.error ||
                'Não foi possível confirmar.';
              Alert.alert('Aviso', msg);
            } finally {
              setEnviandoAcao(false);
            }
          },
        },
      ]
    );
  };

  const abrirModalRecusa = (escalaId) => {
    setEscalaSelecionadaId(escalaId);
    setJustificativa('');
    setModalRecusaVisivel(true);
  };

  const handleEnviarRecusa = async () => {
    if (!justificativa.trim() || justificativa.trim().length < 8) {
      Alert.alert(
        'Justificativa Obrigatória',
        'Informe o motivo com pelo menos 8 caracteres para análise da liderança.'
      );
      return;
    }

    try {
      setEnviandoAcao(true);
      // Registra recusa com a justificativa
      await api.put(`/escalas/${escalaSelecionadaId}/confirmar`, {
        confirmado: false,
        justificativa: justificativa.trim(),
      });
      setModalRecusaVisivel(false);
      Alert.alert('Escala Recusada', 'Sua justificativa foi registrada com sucesso.');
      buscarEscalas();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Falha ao registrar recusa.';
      Alert.alert('Erro', msg);
    } finally {
      setEnviandoAcao(false);
    }
  };

  const handleVerDetalhes = async (escalaId, dataEscala, cultoManha, cultoNoite) => {
    const dataFormatada = formatarData(dataEscala);
    const cultoNome = cultoNoite || cultoManha || 'Culto de Celebração';
    setTituloRepertorio(`${dataFormatada} • ${cultoNome}`);
    setPlaylistUrlAtual(null);
    setCarregandoDetalhes(true);
    setModalRepertorioVisivel(true);

    try {
      const response = await api.get(`/escalas/${escalaId}/detalhes`);
      const data = response.data || {};
      setRepertorioAtual(data.musicas || data.repertorio || []);
      if (data.youtubePlaylistUrl) {
        setPlaylistUrlAtual(data.youtubePlaylistUrl);
      }
    } catch (err) {
      console.warn('Falha ao buscar detalhes da escala:', err);
      setRepertorioAtual([]);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const renderBadgeStatus = (confirmado) => {
    if (confirmado === true) {
      return (
        <View style={[styles.badge, styles.badgeConfirmado]}>
          <CheckCircle2 size={12} color="#15803d" />
          <Text style={[styles.badgeText, { color: '#15803d' }]}>Confirmado</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePendente]}>
        <AlertCircle size={12} color="#b45309" />
        <Text style={[styles.badgeText, { color: '#b45309' }]}>Pendente</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isPendente = item.confirmado !== true;
    const escalaId = item.escalaId || item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dataContainer}>
            <Calendar size={18} color="#FF6B00" />
            <Text style={styles.cardData}>{formatarData(item.dataEscala)}</Text>
          </View>
          {renderBadgeStatus(item.confirmado)}
        </View>

        {/* Exibe o instrumento específico com que o voluntário foi escalado */}
        <View style={styles.departamentoRow}>
          <Text style={styles.departamentoText}>
            FUNÇÃO: {String(item.instrumento || 'LOUVOR').toUpperCase()}
          </Text>
        </View>

        <View style={styles.cultosContainer}>
          {Boolean(item.horarioNoite) && (
            <View style={styles.cultoItem}>
              <Clock size={13} color="#475569" />
              <Text style={styles.cultoTexto}>
                <Text style={styles.cultoPeriodo}>Noite ({formatarHora(item.horarioNoite)}): </Text>
                {item.nomeCultoNoite || 'Culto de Celebração'}
              </Text>
            </View>
          )}

          {Boolean(item.horarioManha) && (
            <View style={styles.cultoItem}>
              <Clock size={13} color="#475569" />
              <Text style={styles.cultoTexto}>
                <Text style={styles.cultoPeriodo}>Manhã ({formatarHora(item.horarioManha)}): </Text>
                {item.nomeCultoManha || 'Culto da Manhã'}
              </Text>
            </View>
          )}
        </View>

        {Boolean(item.observacao) && (
          <Text style={styles.observacaoText}>Obs: {item.observacao}</Text>
        )}

        <View style={styles.botoesApoioRow}>
          <TouchableOpacity
            style={styles.detalhesBtn}
            onPress={() =>
              handleVerDetalhes(
                escalaId,
                item.dataEscala,
                item.nomeCultoManha,
                item.nomeCultoNoite
              )
            }
            activeOpacity={0.7}
          >
            <Music size={15} color="#0284c7" />
            <Text style={styles.detalhesBtnText}>Ver Músicas do Culto</Text>
          </TouchableOpacity>
        </View>

        {isPendente && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.btnAction, styles.btnRecusar]}
              onPress={() => abrirModalRecusa(escalaId)}
              disabled={enviandoAcao}
            >
              <XCircle size={15} color="#ef4444" />
              <Text style={styles.btnRecusarText}>Recusar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnAction, styles.btnConfirmar]}
              onPress={() => handleConfirmar(escalaId)}
              disabled={enviandoAcao}
            >
              <CheckCircle2 size={15} color="#ffffff" />
              <Text style={styles.btnConfirmarText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSaudacao}>
            Olá, {user?.nome ? user.nome.split(' ')[0] : 'Voluntário'}
          </Text>
          <Text style={styles.headerCongregacao}>
            {user?.nomeEmpresa || 'Hope Escala Pro'}
          </Text>
        </View>

        <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <LogOut size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {carregando ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Carregando suas escalas...</Text>
        </View>
      ) : (
        <FlatList
          data={escalas}
          keyExtractor={(item) => String(item.id || item.escalaId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Calendar size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Você não está escalado</Text>
              <Text style={styles.emptySubtitle}>
                Assim que a liderança escalar você para algum culto de domingo, ele aparecerá aqui para sua confirmação.
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL RECUSA */}
      <Modal
        visible={modalRecusaVisivel}
        transparent
        animationType="fade"
        onRequestClose={() => setModalRecusaVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recusar Escala</Text>
            <Text style={styles.modalDesc}>
              Informe o motivo da impossibilidade para que a liderança organize a substituição:
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Viagem, trabalho, problema de saúde..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={justificativa}
              onChangeText={setJustificativa}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnCancelar}
                onPress={() => setModalRecusaVisivel(false)}
                disabled={enviandoAcao}
              >
                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtnConfirmar, enviandoAcao && { opacity: 0.6 }]}
                onPress={handleEnviarRecusa}
                disabled={enviandoAcao}
              >
                {enviandoAcao ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalBtnConfirmarText}>Enviar Recusa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REPERTÓRIO */}
      <Modal
        visible={modalRepertorioVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalRepertorioVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Músicas do Culto</Text>
            <Text style={styles.modalDesc}>{tituloRepertorio}</Text>

            {playlistUrlAtual ? (
              <TouchableOpacity
                style={styles.playlistBanner}
                onPress={() => Linking.openURL(playlistUrlAtual)}
                activeOpacity={0.8}
              >
                <PlaySquare size={20} color="#ffffff" />
                <Text style={styles.playlistBannerText}>Ouvir Playlist no YouTube</Text>
                <ExternalLink size={14} color="#ffffff" />
              </TouchableOpacity>
            ) : null}

            {carregandoDetalhes ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator color="#FF6B00" size="small" />
                <Text style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
                  Carregando repertório...
                </Text>
              </View>
            ) : (
              <FlatList
                data={repertorioAtual}
                keyExtractor={(m, idx) => String(m.id || idx)}
                renderItem={({ item, index }) => (
                  <View style={styles.musicaItem}>
                    <View style={styles.musicaIndexBadge}>
                      <Text style={styles.musicaIndexText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.musicaNome}>{item.titulo || item.nome}</Text>
                      <Text style={styles.musicaDetalhes}>
                        Tom: <Text style={{ fontWeight: '700' }}>{item.tom || 'Padrão'}</Text>
                        {item.artista ? ` • ${item.artista}` : ''}
                      </Text>
                    </View>
                    {(item.linkCifra || item.linkYoutube) && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(item.linkCifra || item.linkYoutube)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <ExternalLink size={18} color="#0284c7" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.semMusicaText}>Nenhuma música vinculada a este culto ainda.</Text>
                }
              />
            )}

            <TouchableOpacity
              style={styles.modalBtnFechar}
              onPress={() => setModalRepertorioVisivel(false)}
            >
              <Text style={styles.modalBtnFecharText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerSaudacao: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  headerCongregacao: { fontSize: 12, color: '#FF6B00', fontWeight: '600', marginTop: 2 },
  logoutBtn: { padding: 6 },
  listContainer: { padding: 16, gap: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 13 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 14 },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dataContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardData: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeConfirmado: { backgroundColor: '#dcfce7' },
  badgePendente: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  departamentoRow: { marginBottom: 10 },
  departamentoText: { fontSize: 11, fontWeight: '800', color: '#ea580c', letterSpacing: 0.5 },
  cultosContainer: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, gap: 6, marginBottom: 12 },
  cultoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cultoTexto: { fontSize: 12, color: '#334155' },
  cultoPeriodo: { fontWeight: '700', color: '#0f172a' },
  observacaoText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 10 },
  botoesApoioRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  detalhesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingVertical: 10,
    borderRadius: 10,
  },
  detalhesBtnText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  actionsContainer: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  btnAction: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnRecusar: { backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  btnRecusarText: { color: '#e11d48', fontSize: 13, fontWeight: '700' },
  btnConfirmar: { backgroundColor: '#16a34a' },
  btnConfirmarText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  modalDesc: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  playlistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  playlistBannerText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, height: 80, textAlignVertical: 'top', fontSize: 13, marginBottom: 16, color: '#0f172a' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtnCancelar: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalBtnCancelarText: { fontWeight: '700', color: '#475569', fontSize: 13 },
  modalBtnConfirmar: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  modalBtnConfirmarText: { fontWeight: '700', color: '#ffffff', fontSize: 13 },
  musicaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  musicaIndexBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  musicaIndexText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },
  musicaNome: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  musicaDetalhes: { fontSize: 12, color: '#64748b', marginTop: 2 },
  semMusicaText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginVertical: 20 },
  modalBtnFechar: { marginTop: 16, height: 44, backgroundColor: '#0f172a', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalBtnFecharText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
});
