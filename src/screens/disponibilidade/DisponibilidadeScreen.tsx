import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  CalendarCheck,
  CalendarX,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface DomingoItem {
  data: string; // "yyyy-MM-dd"
  dia: string;
  mes: string;
  disponivel: boolean;
  periodo: 'NOITE' | 'MANHA' | 'AMBOS';
  temCultoManha?: boolean;
}

export default function DisponibilidadeScreen() {
  const { user, signed } = useAuth();

  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [recarregando, setRecarregando] = useState<boolean>(false);

  // Inicia no mês e ano atuais
  const hoje = new Date();
  const [mesAlvo, setMesAlvo] = useState<number>(hoje.getMonth()); // 0 a 11
  const [anoAlvo, setAnoAlvo] = useState<number>(hoje.getFullYear());

  const [domingos, setDomingos] = useState<DomingoItem[]>([]);
  const [bloqueadoPorPrazo, setBloqueadoPorPrazo] = useState<boolean>(false);

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

  // Regra do dia 25: encerra edição se for para o próximo mês e já passou do dia 25
  const checarPrazoLimite = useCallback(() => {
    const diaAtual = hoje.getDate();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Mês seguinte no calendário
    const ehProximoMes =
      (anoAlvo === anoAtual && mesAlvo === mesAtual + 1) ||
      (anoAlvo === anoAtual + 1 && mesAtual === 11 && mesAlvo === 0);

    // Meses anteriores ao atual sempre ficam bloqueados
    const ehMesPassado =
      anoAlvo < anoAtual || (anoAlvo === anoAtual && mesAlvo < mesAtual);

    if (ehMesPassado) {
      setBloqueadoPorPrazo(true);
    } else if (ehProximoMes && diaAtual > 25) {
      setBloqueadoPorPrazo(true);
    } else {
      setBloqueadoPorPrazo(false);
    }
  }, [anoAlvo, mesAlvo]);

  // Navegação entre meses
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

  // Gera apenas os domingos do mês selecionado
  const gerarDomingosDoMes = useCallback((ano: number, mes: number) => {
    const lista: DomingoItem[] = [];
    const nomesMeses = [
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
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    for (let dia = 1; dia <= totalDias; dia++) {
      const d = new Date(ano, mes, dia);
      if (d.getDay() === 0) {
        // 0 = Domingo
        const diaStr = String(dia).padStart(2, '0');
        const mesStr = String(mes + 1).padStart(2, '0');
        lista.push({
          data: `${ano}-${mesStr}-${diaStr}`,
          dia: diaStr,
          mes: nomesMeses[mes],
          disponivel: true, // Padrão: disponível
          periodo: 'NOITE', // Padrão dominical
          temCultoManha: false,
        });
      }
    }
    return lista;
  }, []);

  // Busca as datas salvas no Spring Boot (GET /disponibilidades/mes)
  const carregarDisponibilidade = useCallback(async () => {
    if (!signed) return;
    try {
      setCarregando(true);
      checarPrazoLimite();

      const domingosBase = gerarDomingosDoMes(anoAlvo, mesAlvo);

      const response = await api.get<any[]>('/disponibilidades/mes', {
        params: {
          mes: mesAlvo + 1,
          ano: anoAlvo,
        },
      });

      const datasSalvas = response.data || [];

      if (Array.isArray(datasSalvas) && datasSalvas.length > 0) {
        const datasFormatadas = datasSalvas.map((item: any) => {
          if (typeof item === 'string') return item.split('T')[0];
          if (Array.isArray(item) && item.length >= 3) {
            const a = item[0];
            const m = String(item[1]).padStart(2, '0');
            const d = String(item[2]).padStart(2, '0');
            return `${a}-${m}-${d}`;
          }
          return '';
        });

        const mesclado = domingosBase.map((dom) => ({
          ...dom,
          disponivel: datasFormatadas.includes(dom.data),
        }));

        setDomingos(mesclado);
      } else {
        setDomingos(domingosBase);
      }
    } catch (error) {
      console.warn('Erro ao buscar disponibilidade, gerando base local:', error);
      setDomingos(gerarDomingosDoMes(anoAlvo, mesAlvo));
    } finally {
      setCarregando(false);
      setRecarregando(false);
    }
  }, [signed, anoAlvo, mesAlvo, checarPrazoLimite, gerarDomingosDoMes]);

  useEffect(() => {
    carregarDisponibilidade();
  }, [carregarDisponibilidade]);

  const onRefresh = () => {
    setRecarregando(true);
    carregarDisponibilidade();
  };

  const toggleDisponibilidade = (index: number) => {
    if (bloqueadoPorPrazo) {
      Alert.alert(
        'Prazo Encerrado',
        'As disponibilidades para este mês foram encerradas no dia 25. Fale com a liderança.'
      );
      return;
    }
    setDomingos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, disponivel: !item.disponivel } : item))
    );
  };

  const alterarPeriodo = (index: number, periodo: 'NOITE' | 'MANHA' | 'AMBOS') => {
    if (bloqueadoPorPrazo) return;
    setDomingos((prev) =>
      prev.map((item, i) => (i === index ? { ...item, periodo } : item))
    );
  };

  // Salva a lista de LocalDate no Spring Boot (POST /disponibilidades/salvar-lote)
  const salvarDisponibilidade = async () => {
    if (bloqueadoPorPrazo) {
      Alert.alert('Atenção', 'O período de edição já foi encerrado pelo prazo limite (dia 25).');
      return;
    }

    try {
      setSalvando(true);

      const datasDisponiveis: string[] = domingos
        .filter((d) => d.disponivel)
        .map((d) => d.data);

      await api.post('/disponibilidades/salvar-lote', datasDisponiveis, {
        params: {
          mes: mesAlvo + 1,
          ano: anoAlvo,
        },
      });

      Alert.alert('Sucesso!', 'Sua disponibilidade foi salva com sucesso.');
    } catch (error: any) {
      console.error('Erro ao salvar disponibilidade:', error.response?.data || error.message);
      Alert.alert(
        'Erro ao Salvar',
        error.response?.data?.message || 'Não foi possível salvar na nuvem agora. Tente novamente.'
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Disponibilidade</Text>
          <Text style={styles.headerSub}>Domingos em que você pode servir</Text>
        </View>
        <View style={styles.badgePrazo}>
          <Clock size={13} color="#f59e0b" />
          <Text style={styles.badgePrazoTexto}>Até dia 25</Text>
        </View>
      </View>

      {/* Seletor de Mês com Navegação */}
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
          <Text style={styles.mesSelectorRegra}>Apenas Domingos</Text>
        </View>

        <TouchableOpacity
          style={styles.btnMesNav}
          onPress={proximoMes}
          activeOpacity={0.7}
        >
          <ChevronRight size={20} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Alerta de Status do Prazo (Regra do dia 25) */}
      {bloqueadoPorPrazo ? (
        <View style={styles.avisoBloqueado}>
          <Lock size={18} color="#ef4444" />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoBloqueadoTitulo}>Prazo limite encerrado (dia 25)</Text>
            <Text style={styles.avisoBloqueadoTexto}>
              O fallback automático foi ativado para este mês. Alterações devem ser solicitadas à liderança.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.avisoAberto}>
          <AlertCircle size={18} color="#22c55e" />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoAbertoTitulo}>Disponibilidade Aberta</Text>
            <Text style={styles.avisoAbertoTexto}>
              Marque os domingos que pode tocar. Desmarque caso tenha viagens ou imprevistos.
            </Text>
          </View>
        </View>
      )}

      {/* Lista de Domingos */}
      {carregando ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoTexto}>Carregando domingos...</Text>
        </View>
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
          {domingos.map((item, index) => (
            <View
              key={item.data}
              style={[
                styles.cardDomingo,
                !item.disponivel && styles.cardDomingoIndisponivel,
              ]}
            >
              <View style={styles.cardTopRow}>
                {/* Data Box formatado */}
                <View
                  style={[
                    styles.dataBox,
                    !item.disponivel && styles.dataBoxIndisponivel,
                  ]}
                >
                  <Text
                    style={[
                      styles.dataDia,
                      !item.disponivel && styles.dataDiaIndisponivel,
                    ]}
                  >
                    {item.dia}
                  </Text>
                  <Text
                    style={[
                      styles.dataMes,
                      !item.disponivel && styles.dataMesIndisponivel,
                    ]}
                  >
                    {item.mes}
                  </Text>
                </View>

                {/* Informação do Domingo */}
                <View style={styles.domingoInfo}>
                  <Text style={styles.domingoTitulo}>Domingo de Celebração</Text>
                  <Text style={styles.domingoStatus}>
                    {item.disponivel ? 'Disponível para escalar' : 'Indisponível neste dia'}
                  </Text>
                </View>

                {/* Botão de Toggle */}
                <TouchableOpacity
                  style={[
                    styles.btnToggle,
                    item.disponivel ? styles.btnToggleAtivo : styles.btnToggleInativo,
                  ]}
                  onPress={() => toggleDisponibilidade(index)}
                  disabled={bloqueadoPorPrazo}
                  activeOpacity={0.8}
                >
                  {item.disponivel ? (
                    <CalendarCheck size={18} color="#22c55e" />
                  ) : (
                    <CalendarX size={18} color="#ef4444" />
                  )}
                  <Text
                    style={[
                      styles.btnToggleTexto,
                      item.disponivel ? styles.btnToggleTextoAtivo : styles.btnToggleTextoInativo,
                    ]}
                  >
                    {item.disponivel ? 'SIM' : 'NÃO'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Seletor de Período (Apenas quando disponível) */}
              {item.disponivel && (
                <View style={styles.periodosContainer}>
                  <Text style={styles.periodosLabel}>Culto pretendido:</Text>
                  <View style={styles.periodosRow}>
                    <TouchableOpacity
                      style={[
                        styles.periodoBtn,
                        item.periodo === 'NOITE' && styles.periodoBtnAtivo,
                      ]}
                      onPress={() => alterarPeriodo(index, 'NOITE')}
                      disabled={bloqueadoPorPrazo}
                    >
                      <Moon
                        size={13}
                        color={item.periodo === 'NOITE' ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.periodoBtnTexto,
                          item.periodo === 'NOITE' && styles.periodoBtnTextoAtivo,
                        ]}
                      >
                        Noite (19h)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.periodoBtn,
                        item.periodo === 'MANHA' && styles.periodoBtnAtivo,
                      ]}
                      onPress={() => alterarPeriodo(index, 'MANHA')}
                      disabled={bloqueadoPorPrazo}
                    >
                      <Sun
                        size={13}
                        color={item.periodo === 'MANHA' ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.periodoBtnTexto,
                          item.periodo === 'MANHA' && styles.periodoBtnTextoAtivo,
                        ]}
                      >
                        Manhã
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.periodoBtn,
                        item.periodo === 'AMBOS' && styles.periodoBtnAtivo,
                      ]}
                      onPress={() => alterarPeriodo(index, 'AMBOS')}
                      disabled={bloqueadoPorPrazo}
                    >
                      <CheckCircle2
                        size={13}
                        color={item.periodo === 'AMBOS' ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.periodoBtnTexto,
                          item.periodo === 'AMBOS' && styles.periodoBtnTextoAtivo,
                        ]}
                      >
                        Ambos
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Botão Flutuante de Salvar */}
      {!bloqueadoPorPrazo && (
        <View style={styles.footerSalvar}>
          <TouchableOpacity
            style={styles.btnSalvar}
            onPress={salvarDisponibilidade}
            disabled={salvando || carregando}
            activeOpacity={0.8}
          >
            {salvando ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={18} color="#ffffff" />
                <Text style={styles.btnSalvarTexto}>Confirmar Disponibilidade</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  badgePrazo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgePrazoTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f59e0b',
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
  avisoAberto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    borderRadius: 12,
  },
  avisoAbertoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  avisoAbertoTexto: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  avisoBloqueado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
  },
  avisoBloqueadoTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  avisoBloqueadoTexto: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
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
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
  },
  cardDomingo: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    gap: 12,
  },
  cardDomingoIndisponivel: {
    opacity: 0.65,
    borderColor: '#1e293b',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dataBox: {
    minWidth: 50,
    minHeight: 50,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataBoxIndisponivel: {
    borderColor: '#475569',
  },
  dataDia: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FF6B00',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dataDiaIndisponivel: {
    color: '#64748b',
  },
  dataMes: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f97316',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dataMesIndisponivel: {
    color: '#475569',
  },
  domingoInfo: {
    flex: 1,
  },
  domingoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  domingoStatus: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  btnToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  btnToggleAtivo: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  btnToggleInativo: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  btnToggleTexto: {
    fontSize: 12,
    fontWeight: '800',
  },
  btnToggleTextoAtivo: {
    color: '#22c55e',
  },
  btnToggleTextoInativo: {
    color: '#ef4444',
  },
  periodosContainer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 8,
  },
  periodosLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  periodosRow: {
    flexDirection: 'row',
    gap: 8,
  },
  periodoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0f172a',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  periodoBtnAtivo: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  periodoBtnTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  periodoBtnTextoAtivo: {
    color: '#ffffff',
  },
  footerSalvar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    padding: 16,
  },
  btnSalvar: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnSalvarTexto: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});