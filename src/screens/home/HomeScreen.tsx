import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  CalendarDays,
  Clock,
  Music,
  Headphones,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  CalendarCheck,
  Bell,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface ProximaEscalaDTO {
  id: number;
  escalaId: number;
  dataEscala: string;
  nomeCultoManha?: string;
  nomeCultoNoite?: string;
  horarioManha?: string;
  horarioNoite?: string;
  instrumento?: string;
  confirmado?: boolean;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [proximaEscala, setProximaEscala] = useState<ProximaEscalaDTO | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [recarregando, setRecarregando] = useState<boolean>(false);

  const carregarDadosHome = useCallback(async () => {
    try {
      setCarregando(true);
      // Busca as escalas do músico
      const response = await api.get<any>('/escala-musicos/minhas-escalas');
      const dados = response.data;

      if (Array.isArray(dados) && dados.length > 0) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Filtra escalas de hoje em diante e ordena cronologicamente
        const futuras = dados
          .map((item: any) => {
            let dataResolvida = '';
            if (typeof item.dataEscala === 'string') {
              dataResolvida = item.dataEscala;
            } else if (Array.isArray(item.dataEscala) && item.dataEscala.length >= 3) {
              const ano = item.dataEscala[0];
              const mes = String(item.dataEscala[1]).padStart(2, '0');
              const dia = String(item.dataEscala[2]).padStart(2, '0');
              dataResolvida = `${ano}-${mes}-${dia}`;
            }
            return {
              id: item.id,
              escalaId: item.escalaId || item.id,
              dataEscala: dataResolvida,
              nomeCultoManha: item.nomeCultoManha,
              nomeCultoNoite: item.nomeCultoNoite,
              horarioManha: item.horarioManha,
              horarioNoite: item.horarioNoite,
              instrumento: item.instrumento || 'Voluntário',
              confirmado: item.confirmado,
            };
          })
          .filter((item) => {
            if (!item.dataEscala) return false;
            const dataItem = new Date(item.dataEscala + 'T00:00:00');
            return dataItem >= hoje;
          })
          .sort((a, b) => new Date(a.dataEscala).getTime() - new Date(b.dataEscala).getTime());

        setProximaEscala(futuras.length > 0 ? futuras[0] : null);
      } else {
        setProximaEscala(null);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados da Home:', error);
      setProximaEscala(null);
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, []);

useEffect(() => {
  let ativo = true;

  const iniciar = async () => {
    // Dá 150ms para garantir que o AsyncStorage e o context estejam prontos
    await new Promise((r) => setTimeout(r, 150));
    if (ativo) {
      carregarDadosHome();
    }
  };

  iniciar();

  return () => {
    ativo = false;
  };
}, [carregarDadosHome]);

  const onRefresh = () => {
    setRecarregando(true);
    carregarDadosHome();
  };

  // Cálculo de dias restantes até a escala
  const calcularDiasRestantes = (dataStr: string) => {
    if (!dataStr) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAlvo = new Date(dataStr + 'T00:00:00');
    const diffTime = dataAlvo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'É hoje!';
    if (diffDays === 1) return 'Amanhã';
    return `Em ${diffDays} dias`;
  };

  const formatarData = (dataStr: string) => {
    if (!dataStr) return { dia: '--', mes: '---' };
    const partes = dataStr.split('-');
    if (partes.length < 3) return { dia: '--', mes: '---' };
    const dia = partes[2].padStart(2, '0');
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const idx = parseInt(partes[1], 10) - 1;
    return { dia, mes: meses[idx] || 'DOM' };
  };

  const primeiroNome = user?.nome ? user.nome.split(' ')[0] : 'Voluntário';

  return (
    <View style={styles.container}>
      {/* Header Fixo */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saudacao}>Olá, {primeiroNome} 👋</Text>
          <Text style={styles.empresa}>{user?.nomeEmpresa || 'Hope Escala Pro'}</Text>
        </View>
        <TouchableOpacity
          style={styles.btnNotificacao}
          onPress={() => navigation.navigate('Notificacoes')}
          activeOpacity={0.7}
        >
          <Bell size={20} color="#FF6B00" />
        </TouchableOpacity>
      </View>

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
        {/* Card Destaque: Próxima Escala */}
        <View style={styles.secao}>
          <View style={styles.secaoHeader}>
            <Sparkles size={16} color="#FF6B00" />
            <Text style={styles.secaoTitulo}>Sua Próxima Escala</Text>
          </View>

          {carregando ? (
            <View style={styles.cardLoading}>
              <ActivityIndicator size="small" color="#FF6B00" />
            </View>
          ) : proximaEscala ? (
            <View style={styles.cardDestaque}>
              <View style={styles.cardDestaqueTop}>
                {/* Data Box formatado */}
                <View style={styles.dataBox}>
                  <Text style={styles.dataDia}>{formatarData(proximaEscala.dataEscala).dia}</Text>
                  <Text style={styles.dataMes}>{formatarData(proximaEscala.dataEscala).mes}</Text>
                </View>

                <View style={styles.destaqueInfo}>
                  <View style={styles.cultoTipoRow}>
                    {proximaEscala.horarioManha ? (
                      <Sun size={15} color="#ea580c" />
                    ) : (
                      <Moon size={15} color="#FF6B00" />
                    )}
                    <Text style={styles.cultoNome} numberOfLines={1}>
                      {proximaEscala.nomeCultoNoite ||
                        proximaEscala.nomeCultoManha ||
                        'Culto de Celebração'}
                    </Text>
                  </View>

                  <View style={styles.horarioRow}>
                    <Clock size={12} color="#94a3b8" />
                    <Text style={styles.horarioTexto}>
                      {(proximaEscala.horarioNoite || proximaEscala.horarioManha || '19:00').substring(0, 5)} • Domingo
                    </Text>
                  </View>

                  <View style={styles.funcaoRow}>
                    <Music size={12} color="#FF6B00" />
                    <Text style={styles.funcaoTexto} numberOfLines={1}>
                      {proximaEscala.instrumento}
                    </Text>
                  </View>
                </View>

                {/* Badge de dias restantes */}
                <View style={styles.diasBadge}>
                  <Text style={styles.diasBadgeTexto}>
                    {calcularDiasRestantes(proximaEscala.dataEscala)}
                  </Text>
                </View>
              </View>

              {/* Ação rápida para a Sala de Ensaio */}
              <TouchableOpacity
                style={styles.btnSalaEnsaioDestaque}
                onPress={() =>
                  navigation.navigate('SalaEnsaio', { escalaId: proximaEscala.escalaId })
                }
                activeOpacity={0.8}
              >
                <Headphones size={16} color="#ffffff" />
                <Text style={styles.btnSalaEnsaioTexto}>Abrir Sala de Ensaio</Text>
                <ChevronRight size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardVazio}>
              <CalendarDays size={32} color="#475569" />
              <Text style={styles.cardVazioTitulo}>Sem escalas futuras</Text>
              <Text style={styles.cardVazioSubtitulo}>
                Você não está escalado para os próximos cultos dominicais.
              </Text>
            </View>
          )}
        </View>

        {/* Lembrete de Regra: Disponibilidade Ativa até dia 25 */}
        <View style={styles.avisoBox}>
          <AlertCircle size={20} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoTitulo}>Atenção à Disponibilidade</Text>
            <Text style={styles.avisoDescricao}>
              Defina suas datas até o <Text style={styles.avisoDestaque}>dia 25</Text> para a escala do próximo mês.
            </Text>
          </View>
        </View>

        {/* Atalhos Rápidos */}
        <View style={styles.secao}>
          <Text style={styles.secaoTituloSimples}>Acesso Rápido</Text>
          <View style={styles.gridAtalhos}>
            <TouchableOpacity
              style={styles.cardAtalho}
              onPress={() => navigation.navigate('MinhasEscalas')}
              activeOpacity={0.8}
            >
              <View style={[styles.atalhoIconeBox, { backgroundColor: 'rgba(255, 107, 0, 0.15)' }]}>
                <CalendarDays size={22} color="#FF6B00" />
              </View>
              <Text style={styles.atalhoTitulo}>Minhas Escalas</Text>
              <Text style={styles.atalhoSub}>Ver todos os cultos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardAtalho}
              onPress={() => navigation.navigate('Disponibilidade')}
              activeOpacity={0.8}
            >
              <View style={[styles.atalhoIconeBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <CalendarCheck size={22} color="#22c55e" />
              </View>
              <Text style={styles.atalhoTitulo}>Disponibilidade</Text>
              <Text style={styles.atalhoSub}>Marcar seus domingos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  saudacao: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  empresa: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  btnNotificacao: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 18,
  },
  secao: {
    gap: 10,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  secaoTituloSimples: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardLoading: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  cardDestaque: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  cardDestaqueTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dataBox: {
    minWidth: 52,
    minHeight: 52,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataDia: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dataMes: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f97316',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 1,
    includeFontPadding: false,
  },
  destaqueInfo: {
    flex: 1,
    gap: 3,
  },
  cultoTipoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cultoNome: {
    fontSize: 15,
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
  funcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  funcaoTexto: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  diasBadge: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diasBadgeTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  btnSalaEnsaioDestaque: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  btnSalaEnsaioTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardVazio: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  cardVazioTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  cardVazioSubtitulo: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  avisoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 14,
  },
  avisoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  avisoDescricao: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 16,
  },
  avisoDestaque: {
    color: '#ffffff',
    fontWeight: '700',
  },
  gridAtalhos: {
    flexDirection: 'row',
    gap: 12,
  },
  cardAtalho: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    gap: 4,
  },
  atalhoIconeBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  atalhoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  atalhoSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
});