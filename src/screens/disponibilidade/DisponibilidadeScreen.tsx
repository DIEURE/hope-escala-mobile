import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { mobileDataService } from '../../services/mobileDataService';
import { CultoAgenda } from '../../types/escala';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DisponibilidadeScreen: React.FC = () => {
  const hoje = new Date();
  const mesPadrao = hoje.getDate() >= 15 ? (hoje.getMonth() + 2 > 12 ? 1 : hoje.getMonth() + 2) : hoje.getMonth() + 1;
  const anoPadrao = hoje.getDate() >= 15 && hoje.getMonth() === 11 ? hoje.getFullYear() + 1 : hoje.getFullYear();

  const [mes, setMes] = useState<number>(mesPadrao);
  const [ano, setAno] = useState<number>(anoPadrao);
  const [cultos, setCultos] = useState<CultoAgenda[]>([]);
  const [datasMarcadas, setDatasMarcadas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [salvando, setSalvando] = useState<boolean>(false);

  const expirouPrazo = hoje.getDate() > 25 && mes === (hoje.getMonth() + 1) && ano === hoje.getFullYear();

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      const [cultosRes, marcadasRes] = await Promise.all([
        mobileDataService.obterCultosDoMes(mes, ano),
        mobileDataService.obterMinhasDatasDisponiveis(mes, ano),
      ]);
      setCultos(cultosRes);
      setDatasMarcadas(marcadasRes);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar a agenda do mês selecionado.');
    } finally {
      setCarregando(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleData = (dataStr: string) => {
    setDatasMarcadas((prev) =>
      prev.includes(dataStr) ? prev.filter((d) => d !== dataStr) : [...prev, dataStr]
    );
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      await mobileDataService.salvarDisponibilidade(mes, ano, datasMarcadas);
      Alert.alert('Sucesso', 'Sua disponibilidade foi registrada com sucesso!');
    } catch (err) {
      console.error(err);
      Alert.alert('Falha', 'Não foi possível salvar sua disponibilidade.');
    } finally {
      setSalvando(false);
    }
  };

  const mudarMes = (direcao: 'ant' | 'prox') => {
    if (direcao === 'ant') {
      if (mes === 1) {
        setMes(12);
        setAno((prev) => prev - 1);
      } else {
        setMes((prev) => prev - 1);
      }
    } else {
      if (mes === 12) {
        setMes(1);
        setAno((prev) => prev + 1);
      } else {
        setMes((prev) => prev + 1);
      }
    }
  };

  const formatarDia = (dataStr: string) => {
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return { dia: partes[2], mes: partes[1] };
    }
    return { dia: '--', mes: '--' };
  };

  return (
    <View style={styles.container}>
      {/* CABEÇALHO DO MÊS */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => mudarMes('ant')}>
          <Text style={styles.navBtnText}>{'◀'}</Text>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navMes}>{MESES[mes - 1]} / {ano}</Text>
          <Text style={styles.navSub}>{datasMarcadas.length} culto(s) selecionado(s)</Text>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => mudarMes('prox')}>
          <Text style={styles.navBtnText}>{'▶'}</Text>
        </TouchableOpacity>
      </View>

      {/* REGRA DO DIA 25 */}
      {expirouPrazo && (
        <View style={styles.alertaPrazo}>
          <Text style={styles.alertaTitulo}>Atenção: Prazo do dia 25 expirado</Text>
          <Text style={styles.alertaDesc}>
            O gerador considerará o fallback de voluntários ativos caso necessário.
          </Text>
        </View>
      )}

      {/* LISTAGEM DE CULTOS */}
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.carregandoText}>Carregando datas de cultos...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {cultos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhum culto configurado na agenda para {MESES[mes - 1]} de {ano}.
              </Text>
            </View>
          ) : (
            cultos.map((culto) => {
              const selecionado = datasMarcadas.includes(culto.data);
              const dataFormatada = formatarDia(culto.data);

              return (
                <TouchableOpacity
                  key={culto.data}
                  style={[styles.card, selecionado && styles.cardSelecionado]}
                  onPress={() => toggleData(culto.data)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dataBadge, selecionado && styles.dataBadgeSelecionado]}>
                    <Text style={[styles.dataDia, selecionado && styles.dataDiaSelecionado]}>
                      {dataFormatada.dia}
                    </Text>
                    <Text style={[styles.dataMes, selecionado && styles.dataMesSelecionado]}>
                      DOM
                    </Text>
                  </View>

                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitulo}>{culto.nome || 'Culto de Celebração'}</Text>
                    <Text style={styles.cardHorario}>{culto.horario || 'Domingo'}</Text>
                  </View>

                  <View style={[styles.checkCircle, selecionado && styles.checkCircleAtivo]}>
                    {selecionado && <Text style={styles.checkText}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* BOTÃO FIXO DE SALVAR */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnSalvar, salvando && styles.btnDisabled]}
          disabled={salvando || carregando}
          onPress={handleSalvar}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnSalvarText}>
              Salvar Disponibilidade ({datasMarcadas.length})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DisponibilidadeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  carregandoText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  navBtn: {
    padding: 10,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  navBtnText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navCenter: {
    alignItems: 'center',
  },
  navMes: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  alertaPrazo: {
    margin: 16,
    padding: 12,
    backgroundColor: '#451a03',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertaTitulo: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertaDesc: {
    color: '#fde68a',
    fontSize: 11,
    marginTop: 2,
  },
  lista: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardSelecionado: {
    borderColor: '#FF6B00',
    backgroundColor: '#1c1917',
  },
  dataBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataBadgeSelecionado: {
    backgroundColor: '#FF6B00',
  },
  dataDia: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dataDiaSelecionado: {
    color: '#ffffff',
  },
  dataMes: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  dataMesSelecionado: {
    color: '#ffffff',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitulo: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  cardHorario: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleAtivo: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  btnSalvar: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnSalvarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
