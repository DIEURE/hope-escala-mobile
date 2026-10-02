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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CalendarDays,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Music,
  UserCheck,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export interface MusicoEscaladoDTO {
  id: number;
  usuarioId: number;
  nome: string;
  instrumento?: string | null;
  funcao?: string | null;
  confirmado?: boolean | null;
}

export interface CultoEscalaDTO {
  id: number;
  tipoCulto: 'MANHA' | 'NOITE' | string;
  nomeCulto?: string | null;
  horario?: string | null;
  ministroLouvor?: string | null;
  musicos: MusicoEscaladoDTO[];
}

export interface DomingoEscalaDTO {
  id: number;
  data: string; // YYYY-MM-DD
  diaNumero: string;
  mesAbreviado: string;
  cultos: CultoEscalaDTO[];
}

export default function EscalaMensalScreen() {
  const { user } = useAuth();

  const dataAtual = new Date();
  const [ano, setAno] = useState<number>(dataAtual.getFullYear());
  const [mes, setMes] = useState<number>(dataAtual.getMonth() + 1);

  const [domingos, setDomingos] = useState<DomingoEscalaDTO[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [recarregando, setRecarregando] = useState<boolean>(false);

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const buscarEscalaMes = useCallback(async () => {
    try {
      setCarregando(true);
      // Chamada da API para a escala completa do mês
      const response = await api.get<any>('/escalas/mes', {
        params: {
          ano,
          mes,
          empresaId: user?.empresaId,
        },
      });

      const dados = response.data;
      
      // Mapeia caso venha como lista de escalas ou agrupada por domingos
      if (Array.isArray(dados)) {
        const domingosFormatados: DomingoEscalaDTO[] = dados.map((item: any, idx: number) => {
          const partesData = String(item.data || item.dataEscala || '').split('-');
          const diaNum = partesData[2] || String(idx + 1).padStart(2, '0');
          const mesNum = parseInt(partesData[1] || String(mes), 10) - 1;
          const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

          return {
            id: item.id || idx,
            data: item.data || item.dataEscala,
            diaNumero: diaNum,
            mesAbreviado: mesesAbrev[mesNum] || 'DOM',
            cultos: item.cultos || [
              ...(item.horarioNoite ? [{
                id: item.id * 10 + 2,
                tipoCulto: 'NOITE',
                nomeCulto: item.nomeCultoNoite || 'Culto de Celebração',
                horario: item.horarioNoite,
                ministroLouvor: item.ministroNoite || item.ministro,
                musicos: item.musicosNoite || item.musicos || [],
              }] : []),
              ...(item.horarioManha ? [{
                id: item.id * 10 + 1,
                tipoCulto: 'MANHA',
                nomeCulto: item.nomeCultoManha || 'Culto Matutino',
                horario: item.horarioManha,
                ministroLouvor: item.ministroManha,
                musicos: item.musicosManha || [],
              }] : []),
            ],
          };
        });

        setDomingos(domingosFormatados);
      } else {
        setDomingos([]);
      }
    } catch (error) {
      console.warn('Erro ao carregar escala do mês:', error);
      setDomingos([]);
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, [ano, mes, user?.empresaId]);

  useEffect(() => {
    buscarEscalaMes();
  }, [buscarEscalaMes]);

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno((prev) => prev - 1);
    } else {
      setMes((prev) => prev - 1);
    }
  };

  const proximoMes = () => {
    if (mes === 12) {
      setMes(1);
      setAno((prev) => prev + 1);
    } else {
      setMes((prev) => prev + 1);
    }
  };

  const onRefresh = () => {
    setRecarregando(true);
    buscarEscalaMes();
  };

  const renderDomingo = ({ item }: { item: DomingoEscalaDTO }) => {
    return (
      <View style={styles.domingoCard}>
        {/* CABEÇALHO DO DOMINGO */}
        <View style={styles.domingoHeader}>
          <View style={styles.dataBadge}>
            <Text style={styles.dataBadgeDia}>{item.diaNumero}</Text>
            <Text style={styles.dataBadgeMes}>{item.mesAbreviado}</Text>
          </View>
          <View style={styles.domingoHeaderInfo}>
            <Text style={styles.domingoTitulo}>Domingo de Louvor</Text>
            <Text style={styles.domingoSubtitulo}>{item.data}</Text>
          </View>
        </View>

        {/* LISTAGEM DOS CULTOS DE DOMINGO */}
        <View style={styles.cultosContainer}>
          {item.cultos && item.cultos.length > 0 ? (
            item.cultos.map((culto) => {
              const isManha = culto.tipoCulto === 'MANHA';
              return (
                <View key={culto.id} style={styles.cultoCard}>
                  {/* TÍTULO DO CULTO */}
                  <View style={styles.cultoCardHeader}>
                    <View style={styles.cultoIconRow}>
                      {isManha ? (
                        <Sun size={15} color="#ea580c" />
                      ) : (
                        <Moon size={15} color="#FF6B00" />
                      )}
                      <Text style={styles.cultoNome}>
                        {culto.nomeCulto || (isManha ? 'Culto Matutino' : 'Culto Noturno')}
                      </Text>
                    </View>
                    {Boolean(culto.horario) && (
                      <View style={styles.horarioBadge}>
                        <Clock size={11} color="#475569" />
                        <Text style={styles.horarioTexto}>{String(culto.horario).substring(0, 5)}</Text>
                      </View>
                    )}
                  </View>

                  {/* MINISTRO RESPONSÁVEL */}
                  {Boolean(culto.ministroLouvor) && (
                    <View style={styles.ministroRow}>
                      <UserCheck size={14} color="#16a34a" />
                      <Text style={styles.ministroTexto}>
                        Ministro(a): <Text style={{ fontWeight: '700', color: '#0f172a' }}>{culto.ministroLouvor}</Text>
                      </Text>
                    </View>
                  )}

                  {/* MÚSICOS E VOZES */}
                  {culto.musicos && culto.musicos.length > 0 ? (
                    <View style={styles.musicosGrid}>
                      {culto.musicos.map((m) => (
                        <View key={m.id || m.usuarioId} style={styles.musicoChip}>
                          <Music size={11} color="#64748b" />
                          <Text style={styles.musicoNome}>{m.nome}</Text>
                          {Boolean(m.instrumento || m.funcao) && (
                            <Text style={styles.musicoFuncao}>
                              • {m.instrumento || m.funcao}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.semMusicosTexto}>Nenhum voluntário escalado ainda.</Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.semMusicosTexto}>Nenhum culto configurado para este domingo.</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SELETOR DE MÊS */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Escala Geral do Mês</Text>
        <Text style={styles.headerCongregacao}>{user?.nomeEmpresa || 'Hope Escala Pro'}</Text>

        <View style={styles.seletorMesContainer}>
          <TouchableOpacity onPress={mesAnterior} style={styles.setaBtn}>
            <ChevronLeft size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.mesAtualBox}>
            <CalendarDays size={16} color="#FF6B00" />
            <Text style={styles.mesAtualTexto}>
              {nomesMeses[mes - 1]} de {ano}
            </Text>
          </View>

          <TouchableOpacity onPress={proximoMes} style={styles.setaBtn}>
            <ChevronRight size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* LISTAGEM DOS DOMINGOS */}
      {carregando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoTexto}>Carregando escalas do mês...</Text>
        </View>
      ) : (
        <FlatList
          data={domingos}
          keyExtractor={(item) => String(item.id || item.data)}
          renderItem={renderDomingo}
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
              <Users size={40} color="#cbd5e1" />
              <Text style={styles.emptyTitulo}>Nenhuma escala publicada</Text>
              <Text style={styles.emptySubtitulo}>
                A liderança ainda não publicou as escalas para {nomesMeses[mes - 1]} de {ano}.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerCongregacao: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  seletorMesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  setaBtn: {
    padding: 6,
  },
  mesAtualBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mesAtualTexto: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carregandoTexto: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 13,
  },
  domingoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  domingoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dataBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataBadgeDia: {
    fontSize: 16,
    fontWeight: '800',
    color: '#c2410c',
    lineHeight: 18,
  },
  dataBadgeMes: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
    letterSpacing: 0.5,
  },
  domingoHeaderInfo: {
    flex: 1,
  },
  domingoTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  domingoSubtitulo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  cultosContainer: {
    gap: 10,
  },
  cultoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cultoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cultoIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cultoNome: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  horarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  horarioTexto: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  ministroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#f0fdf4',
    padding: 6,
    borderRadius: 8,
  },
  ministroTexto: {
    fontSize: 12,
    color: '#15803d',
  },
  musicosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  musicoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  musicoNome: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  musicoFuncao: {
    fontSize: 10,
    color: '#64748b',
  },
  semMusicosTexto: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
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
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitulo: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
