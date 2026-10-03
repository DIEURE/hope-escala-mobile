import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import {
  Users,
  CalendarDays,
  Clock,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Music,
  Mic,
  AlertCircle,
  Headphones,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface VoluntarioEscalaDTO {
  usuarioId: number;
  nome: string;
  instrumento: string;
}

interface EscalaMesDTO {
  id: number;
  data: string; // "yyyy-MM-dd"
  observacao?: string;
  voluntarios: VoluntarioEscalaDTO[];
}

export default function EscalaMensalScreen() {
  const { user, signed } = useAuth();
  const navigation = useNavigation<any>();

  const hoje = new Date();
  const [mesAlvo, setMesAlvo] = useState<number>(hoje.getMonth()); // 0 a 11
  const [anoAlvo, setAnoAlvo] = useState<number>(hoje.getFullYear());

  const [escalas, setEscalas] = useState<EscalaMesDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [recarregando, setRecarregando] = useState<boolean>(false);

  const nomesMesesCompletos = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const mesAnterior = () => {
    if (mesAlvo === 0) {
      setMesAlvo(11);
      setAnoAlvo((prev) => prev - 1);
    } else {
      setMesAlvo((prev) => prev - 1);
    }
  };

  const proximoMes = () => {
    if (mesAlvo === 11) {
      setMesAlvo(0);
      setAnoAlvo((prev) => prev + 1);
    } else {
      setMesAlvo((prev) => prev + 1);
    }
  };

  const normalizarData = (dataRaw: any): string => {
    if (!dataRaw) return '';

    if (typeof dataRaw === 'string') {
      return dataRaw.split('T')[0];
    }

    if (Array.isArray(dataRaw) && dataRaw.length >= 3) {
      const a = dataRaw[0];
      const m = String(dataRaw[1]).padStart(2, '0');
      const d = String(dataRaw[2]).padStart(2, '0');
      return `${a}-${m}-${d}`;
    }

    return '';
  };

  const formatarDataBox = (dataStr?: string) => {
    if (!dataStr || typeof dataStr !== 'string') {
      return { dia: '--', mes: 'DOM' };
    }

    const partes = dataStr.split('-');
    if (partes.length < 3) {
      return { dia: '--', mes: 'DOM' };
    }

    const dia = partes[2] || '--';
    const meses = [
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ',
    ];

    const mesIndex = parseInt(partes[1], 10) - 1;
    const mes = mesIndex >= 0 && mesIndex < 12 ? meses[mesIndex] : 'DOM';

    return { dia, mes };
  };

  const carregarEscalaMensal = useCallback(async () => {
    if (!signed) return;
    try {
      setCarregando(true);

      const depId =
        user?.departamentoId && user.departamentoId !== 1
          ? user.departamentoId
          : 2;

      const response = await api.get<any[]>('/escalas/mes', {
        params: {
          departamentoId: depId,
          mes: mesAlvo + 1,
          ano: anoAlvo,
        },
      });

      const dados = Array.isArray(response.data) ? response.data : [];

      const listaNormalizada: EscalaMesDTO[] = dados
        .map((item: any) => {
          const dataBruta =
            item?.data || item?.dataEscala || item?.dataHora || '';
          const dataResolvida = normalizarData(dataBruta);

          return {
            id: item?.id || Math.random(),
            data: dataResolvida,
            observacao: item?.observacao || item?.nome || '',
            voluntarios: Array.isArray(item?.voluntarios)
              ? item.voluntarios.map((v: any) => ({
                  usuarioId: v?.usuarioId || v?.id || 0,
                  nome: v?.nome || 'Voluntário',
                  instrumento: v?.instrumento || 'Louvor',
                }))
              : [],
          };
        })
        .filter((item: EscalaMesDTO) => Boolean(item.data && item.data.length >= 8))
        .sort(
          (a, b) =>
            new Date(a.data).getTime() - new Date(b.data).getTime()
        );

      setEscalas(listaNormalizada);
    } catch (error) {
      console.warn('Erro ao carregar escalas do mês:', error);
      setEscalas([]);
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, [signed, mesAlvo, anoAlvo, user]);

  useEffect(() => {
    carregarEscalaMensal();
  }, [carregarEscalaMensal]);

  const onRefresh = () => {
    setRecarregando(true);
    carregarEscalaMensal();
  };

  const getIconeInstrumento = (instrumento: string) => {
    const inst = (instrumento || '').toLowerCase();
    if (
      inst.includes('voz') ||
      inst.includes('ministr') ||
      inst.includes('canto') ||
      inst.includes('vocal') ||
      inst.includes('backing')
    ) {
      return <Mic size={14} color="#FF6B00" />;
    }
    return <Music size={14} color="#FF6B00" />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Escala Mensal</Text>
          <Text style={styles.headerSub}>Equipe escalada para cada culto</Text>
        </View>
        <View style={styles.badgeGeral}>
          <Users size={14} color="#FF6B00" />
          <Text style={styles.badgeGeralTexto}>Louvor</Text>
        </View>
      </View>

      {/* Seletor de Mês */}
      <View style={styles.mesSelectorRow}>
        <TouchableOpacity
          style={styles.btnMesNav}
          onPress={mesAnterior}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#FF6B00" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.mesSelectorTitulo}>
            {nomesMesesCompletos[mesAlvo]} de {anoAlvo}
          </Text>
          <Text style={styles.mesSelectorRegra}>Cultos Dominicais</Text>
        </View>

        <TouchableOpacity
          style={styles.btnMesNav}
          onPress={proximoMes}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      {carregando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoTexto}>Carregando escalas do mês...</Text>
        </View>
      ) : escalas.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centerVazio}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
        >
          <AlertCircle size={44} color="#475569" />
          <Text style={styles.vazioTitulo}>Nenhuma escala publicada</Text>
          <Text style={styles.vazioSub}>
            A escala oficial de {nomesMesesCompletos[mesAlvo]} de {anoAlvo} ainda não foi gerada ou não há voluntários vinculados.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={recarregando}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
        >
          {escalas.map((escala) => {
            const dataBox = formatarDataBox(escala.data);
            const obs = (escala.observacao || '').toLowerCase();
            const ehManha = obs.includes('manhã') || obs.includes('manha');

            return (
              <View key={escala.id} style={styles.cardEscala}>
                {/* Topo do Card */}
                <View style={styles.cardHeader}>
                  <View style={styles.dataBox}>
                    <Text style={styles.dataDia}>{dataBox.dia}</Text>
                    <Text style={styles.dataMes}>{dataBox.mes}</Text>
                  </View>

                  <View style={styles.cultoInfo}>
                    <View style={styles.cultoTipoRow}>
                      {ehManha ? (
                        <Sun size={15} color="#ea580c" />
                      ) : (
                        <Moon size={15} color="#FF6B00" />
                      )}
                      <Text style={styles.cultoNome} numberOfLines={1}>
                        {escala.observacao || 'Culto de Celebração'}
                      </Text>
                    </View>
                    <View style={styles.horarioRow}>
                      <Clock size={12} color="#94a3b8" />
                      <Text style={styles.horarioTexto}>
                        {ehManha ? '09:00' : '19:00'} • Domingo
                      </Text>
                    </View>
                  </View>

                  {/* Atalho para a Sala de Ensaio deste culto */}
                  <TouchableOpacity
                    style={styles.btnSalaEnsaio}
                    onPress={() =>
                      navigation.navigate('SalaEnsaio', { escalaId: escala.id })
                    }
                    activeOpacity={0.7}
                  >
                    <Headphones size={15} color="#FF6B00" />
                  </TouchableOpacity>
                </View>

                {/* Grade de Voluntários */}
                <View style={styles.equipeContainer}>
                  <View style={styles.equipeHeader}>
                    <Users size={13} color="#94a3b8" />
                    <Text style={styles.equipeHeaderTexto}>
                      Equipe escalada ({escala.voluntarios.length})
                    </Text>
                  </View>

                  {escala.voluntarios.length === 0 ? (
                    <Text style={styles.semMusicosTexto}>Nenhum voluntário vinculado.</Text>
                  ) : (
                    <View style={styles.musicosGrid}>
                      {escala.voluntarios.map((v, idx) => (
                        <View key={`${v.usuarioId}-${idx}`} style={styles.musicoCard}>
                          <View style={styles.musicoIconBox}>
                            {getIconeInstrumento(v.instrumento)}
                          </View>
                          <View style={styles.musicoTextos}>
                            <Text style={styles.musicoNome} numberOfLines={1}>
                              {v.nome}
                            </Text>
                            <Text style={styles.musicoInstrumento} numberOfLines={1}>
                              {v.instrumento}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
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
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  badgeGeral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
  },
  badgeGeralTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  mesSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  btnMesNav: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesSelectorTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  mesSelectorRegra: {
    fontSize: 11,
    color: '#FF6B00',
    fontWeight: '700',
    textTransform: 'uppercase',
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
  centerVazio: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 10,
  },
  vazioTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  vazioSub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 30,
  },
  cardEscala: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dataBox: {
    minWidth: 48,
    minHeight: 48,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataDia: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B00',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dataMes: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f97316',
    textAlign: 'center',
    includeFontPadding: false,
  },
  cultoInfo: {
    flex: 1,
    gap: 3,
  },
  cultoTipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cultoNome: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  horarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  horarioTexto: {
    fontSize: 12,
    color: '#94a3b8',
  },
  btnSalaEnsaio: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipeContainer: {
    padding: 14,
    gap: 10,
  },
  equipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipeHeaderTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  semMusicosTexto: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  musicosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  musicoCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  musicoIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicoTextos: {
    flex: 1,
  },
  musicoNome: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  musicoInstrumento: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
});