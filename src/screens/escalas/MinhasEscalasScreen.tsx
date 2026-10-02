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
  Alert,
} from 'react-native';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
  Moon,
  Music,
  ShieldAlert,
  Headphones,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export type StatusPresenca = 'CONFIRMADO' | 'RECUSADO' | 'PENDENTE';

export interface MinhaEscalaItemDTO {
  id: number;
  escalaId: number;
  data: string; // YYYY-MM-DD
  diaSemana?: string;
  tipoCulto: 'MANHA' | 'NOITE' | string;
  nomeCulto?: string | null;
  horario?: string | null;
  instrumentoOuFuncao?: string | null;
  ministro?: string | null;
  status: StatusPresenca;
  observacao?: string | null;
}

export default function MinhasEscalasScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [escalas, setEscalas] = useState<MinhaEscalaItemDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [recarregando, setRecarregando] = useState<boolean>(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);

  const carregarMinhasEscalas = useCallback(async () => {
    try {
      setCarregando(true);
      const response = await api.get<any>('/escala-musicos/minhas-escalas');
      const dados = response.data;

      if (Array.isArray(dados)) {
        const formatados: MinhaEscalaItemDTO[] = dados.map((item: any, idx: number) => {
          let statusNormalizado: StatusPresenca = 'PENDENTE';
          if (item.confirmado === true || item.status === 'CONFIRMADO') {
            statusNormalizado = 'CONFIRMADO';
          } else if (item.confirmado === false || item.status === 'RECUSADO') {
            statusNormalizado = 'RECUSADO';
          }

          return {
            id: item.id || idx,
            escalaId: item.escalaId || item.id,
            data: item.data || item.dataCulto || '',
            diaSemana: item.diaSemana || 'DOMINGO',
            tipoCulto: item.tipoCulto || (item.periodo === 'MANHA' ? 'MANHA' : 'NOITE'),
            nomeCulto: item.nomeCulto || (item.tipoCulto === 'MANHA' ? 'Culto Matutino' : 'Culto Noturno'),
            horario: item.horario || item.hora || (item.tipoCulto === 'MANHA' ? '09:00' : '19:00'),
            instrumentoOuFuncao: item.instrumento || item.funcao || item.nomeInstrumento || 'Voluntário',
            ministro: item.ministro || item.nomeMinistro,
            status: statusNormalizado,
            observacao: item.observacao,
          };
        });

        // Ordenação das escalas por data em ordem crescente (ASC)
        const ordenadosAsc = formatados.sort((a, b) => {
          const timestampA = a.data ? new Date(a.data).getTime() : 0;
          const timestampB = b.data ? new Date(b.data).getTime() : 0;
          return timestampA - timestampB;
        });

        setEscalas(ordenadosAsc);
      } else {
        setEscalas([]);
      }
    } catch (error) {
      console.warn('Erro ao buscar minhas escalas:', error);
      setEscalas([]);
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarMinhasEscalas();
  }, [carregarMinhasEscalas]);

  const onRefresh = () => {
    setRecarregando(true);
    carregarMinhasEscalas();
  };

  const handleConfirmar = async (escala: MinhaEscalaItemDTO) => {
    try {
      setProcessandoId(escala.id);
      await api.put(`/escala-musicos/${escala.id}/confirmar`);

      setEscalas((prev) =>
        prev.map((e) => (e.id === escala.id ? { ...e, status: 'CONFIRMADO' } : e))
      );

      const msg = 'Sua presença no culto foi confirmada com sucesso!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Escala Confirmada', msg);
    } catch (error: any) {
      console.error('Erro ao confirmar escala:', error);
      const msg = error.response?.data?.message || 'Não foi possível confirmar no momento.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Falha', msg);
    } finally {
      setProcessandoId(null);
    }
  };

  const handleRecusar = (escala: MinhaEscalaItemDTO) => {
    const executarRecusa = async () => {
      try {
        setProcessandoId(escala.id);
        await api.put(`/escala-musicos/${escala.id}/recusar`);

        setEscalas((prev) =>
          prev.map((e) => (e.id === escala.id ? { ...e, status: 'RECUSADO' } : e))
        );

        const msg = 'Recusa registrada. Avise sua liderança caso precise de troca.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Escala Recusada', msg);
      } catch (error: any) {
        console.error('Erro ao recusar escala:', error);
        const msg = error.response?.data?.message || 'Não foi possível recusar no momento.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Falha', msg);
      } finally {
        setProcessandoId(null);
      }
    };

    const textoAviso =
      'Atenção: recusas injustificadas ou consecutivas impactam as escalas dos próximos meses. Deseja realmente recusar esta escala?';

    if (Platform.OS === 'web') {
      const confirmou = window.confirm(textoAviso);
      if (confirmou) executarRecusa();
    } else {
      Alert.alert('Recusar Escala', textoAviso, [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Sim, Recusar', style: 'destructive', onPress: executarRecusa },
      ]);
    }
  };

  const abrirSalaEnsaio = (escala: MinhaEscalaItemDTO) => {
    navigation.navigate('SalaEnsaio', { escalaId: escala.escalaId });
  };

  const extrairData = (dataStr: string) => {
    if (!dataStr) return { dia: '--', mes: '---' };
    const partes = dataStr.split('-');
    const dia = partes[2] || '--';
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const idx = parseInt(partes[1], 10) - 1;
    return { dia, mes: meses[idx] || 'DOM' };
  };

  const renderBadgeStatus = (status: StatusPresenca) => {
    switch (status) {
      case 'CONFIRMADO':
        return (
          <View style={[styles.statusBadge, styles.statusConfirmado]}>
            <CheckCircle2 size={12} color="#22c55e" />
            <Text style={[styles.statusTexto, { color: '#22c55e' }]}>Confirmado</Text>
          </View>
        );
      case 'RECUSADO':
        return (
          <View style={[styles.statusBadge, styles.statusRecusado]}>
            <XCircle size={12} color="#ef4444" />
            <Text style={[styles.statusTexto, { color: '#ef4444' }]}>Recusado</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.statusPendente]}>
            <AlertCircle size={12} color="#f59e0b" />
            <Text style={[styles.statusTexto, { color: '#f59e0b' }]}>Pendente</Text>
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: MinhaEscalaItemDTO }) => {
    const { dia, mes } = extrairData(item.data);
    const isManha = item.tipoCulto === 'MANHA';
    const estaProcessando = processandoId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dataBox}>
            <Text style={styles.dataDia}>{dia}</Text>
            <Text style={styles.dataMes}>{mes}</Text>
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.cultoTipoRow}>
              {isManha ? <Sun size={15} color="#ea580c" /> : <Moon size={15} color="#FF6B00" />}
              <Text style={styles.cultoTitulo}>{item.nomeCulto}</Text>
            </View>

            <View style={styles.horarioRow}>
              <Clock size={12} color="#94a3b8" />
              <Text style={styles.horarioTexto}>{item.horario?.substring(0, 5)} • Domingo</Text>
            </View>
          </View>

          {renderBadgeStatus(item.status)}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detalheItem}>
            <Music size={14} color="#FF6B00" />
            <Text style={styles.detalheLabel}>Sua Função:</Text>
            <Text style={styles.detalheValor}>{item.instrumentoOuFuncao}</Text>
          </View>

          {Boolean(item.ministro) && (
            <View style={styles.detalheItem}>
              <CalendarDays size={14} color="#64748b" />
              <Text style={styles.detalheLabel}>Ministro:</Text>
              <Text style={styles.detalheValor}>{item.ministro}</Text>
            </View>
          )}

          {/* BOTÃO DA SALA DE ENSAIO */}
          <TouchableOpacity
            style={styles.btnSalaEnsaio}
            onPress={() => abrirSalaEnsaio(item)}
            activeOpacity={0.8}
          >
            <Headphones size={15} color="#FF6B00" />
            <Text style={styles.btnSalaEnsaioTexto}>Estudar Repertório & Cifras</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardAcoes}>
          {estaProcessando ? (
            <ActivityIndicator size="small" color="#FF6B00" style={{ paddingVertical: 8 }} />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.btnAcao,
                  styles.btnConfirmar,
                  item.status === 'CONFIRMADO' && styles.btnDesabilitado,
                ]}
                onPress={() => handleConfirmar(item)}
                disabled={item.status === 'CONFIRMADO'}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color="#ffffff" />
                <Text style={styles.btnTextoBranco}>
                  {item.status === 'CONFIRMADO' ? 'Presença Confirmada' : 'Confirmar Presença'}
                </Text>
              </TouchableOpacity>

              {item.status !== 'RECUSADO' && (
                <TouchableOpacity
                  style={[styles.btnAcao, styles.btnRecusar]}
                  onPress={() => handleRecusar(item)}
                  activeOpacity={0.8}
                >
                  <XCircle size={16} color="#ef4444" />
                  <Text style={styles.btnTextoRecusar}>Recusar</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Minhas Escalas</Text>
          <Text style={styles.headerSubtitulo}>
            {user?.nome ? `Olá, ${user.nome.split(' ')[0]}` : 'Suas participações'} • {user?.nomeEmpresa || 'Hope Escala'}
          </Text>
        </View>
        <View style={styles.badgeRegra}>
          <ShieldAlert size={14} color="#f59e0b" />
          <Text style={styles.badgeRegraTexto}>Cultos Dominicais</Text>
        </View>
      </View>

      {carregando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoTexto}>Buscando suas escalas...</Text>
        </View>
      ) : (
        <FlatList
          data={escalas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarDays size={48} color="#334155" />
              <Text style={styles.emptyTitulo}>Nenhuma escala para você</Text>
              <Text style={styles.emptySubtitulo}>
                Você não está escalado para os próximos domingos ou as escalas deste mês ainda não foram publicadas.
              </Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  badgeRegra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRegraTexto: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 14,
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dataBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataDia: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
    lineHeight: 20,
  },
  dataMes: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  headerInfo: {
    flex: 1,
  },
  cultoTipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cultoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  horarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  horarioTexto: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmado: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusRecusado: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusPendente: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    paddingVertical: 12,
    gap: 10,
  },
  detalheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalheLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detalheValor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  btnSalaEnsaio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  btnSalaEnsaioTexto: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '700',
  },
  cardAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  btnAcao: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnConfirmar: {
    backgroundColor: '#16a34a',
  },
  btnRecusar: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnDesabilitado: {
    backgroundColor: '#15803d',
    opacity: 0.8,
  },
  btnTextoBranco: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnTextoRecusar: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
  emptySubtitulo: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
