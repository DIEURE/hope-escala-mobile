import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import {
  User,
  Mail,
  Building2,
  Shield,
  LogOut,
  CalendarCheck,
  CheckCircle,
  HelpCircle,
  Flame,
  KeyRound,
  Edit3,
  X,
  Lock,
  Phone,
  Save,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function PerfilScreen() {
  const { user, logout, updateUser } = useAuth();

  const [saindo, setSaindo] = useState<boolean>(false);

  // Estados do Modal de Edição de Perfil
  const [modalDadosAberto, setModalDadosAberto] = useState<boolean>(false);
  const [nome, setNome] = useState<string>(user?.nome || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [telefone, setTelefone] = useState<string>(user?.telefone || '');
  const [salvandoDados, setSalvandoDados] = useState<boolean>(false);

  // Estados do Modal de Troca de Senha
  const [modalSenhaAberto, setModalSenhaAberto] = useState<boolean>(false);
  const [senhaAtual, setSenhaAtual] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmaSenha, setConfirmaSenha] = useState<string>('');
  const [salvandoSenha, setSalvandoSenha] = useState<boolean>(false);

  const getIniciais = (nomeRef?: string) => {
    if (!nomeRef) return 'H';
    const partes = nomeRef.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const abrirModalDados = () => {
    setNome(user?.nome || '');
    setEmail(user?.email || '');
    setTelefone(user?.telefone || '');
    setModalDadosAberto(true);
  };

  const abrirModalSenha = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmaSenha('');
    setModalSenhaAberto(true);
  };

  const handleSalvarDados = async () => {
    if (!nome.trim() || !email.trim()) {
      const msg = 'Por favor, preencha nome e e-mail.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    try {
      setSalvandoDados(true);
      const payload = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
      };

      const response = await api.put(`/usuarios/${user?.id}`, payload);
      const usuarioAtualizado = response.data;

      if (updateUser) {
        updateUser({
          ...user!,
          nome: usuarioAtualizado.nome || payload.nome,
          email: usuarioAtualizado.email || payload.email,
          telefone: usuarioAtualizado.telefone || payload.telefone,
        });
      }

      const msgSucesso = 'Dados cadastrais atualizados com sucesso!';
      Platform.OS === 'web' ? window.alert(msgSucesso) : Alert.alert('Sucesso', msgSucesso);
      setModalDadosAberto(false);
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      const msgErro = error.response?.data?.message || 'Não foi possível atualizar seus dados.';
      Platform.OS === 'web' ? window.alert(msgErro) : Alert.alert('Erro', msgErro);
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleSalvarSenha = async () => {
    if (!senhaAtual || !novaSenha || !confirmaSenha) {
      const msg = 'Preencha todos os campos de senha.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    if (novaSenha !== confirmaSenha) {
      const msg = 'A nova senha e a confirmação não coincidem.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    if (novaSenha.length < 6) {
      const msg = 'A nova senha deve ter no mínimo 6 caracteres.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
      return;
    }

    try {
      setSalvandoSenha(true);
      await api.put(`/usuarios/${user?.id}/alterar-senha`, {
        senhaAtual,
        novaSenha,
      });

      const msgSucesso = 'Senha alterada com sucesso!';
      Platform.OS === 'web' ? window.alert(msgSucesso) : Alert.alert('Sucesso', msgSucesso);
      setModalSenhaAberto(false);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      const msgErro = error.response?.data?.message || 'Senha atual incorreta ou inválida.';
      Platform.OS === 'web' ? window.alert(msgErro) : Alert.alert('Erro', msgErro);
    } finally {
      setSalvandoSenha(false);
    }
  };

  const handleLogout = () => {
    const executar = async () => {
      try {
        setSaindo(true);
        await logout();
      } catch (e) {
        console.error('Erro ao sair:', e);
      } finally {
        setSaindo(false);
      }
    };

    const texto = 'Deseja realmente sair da sua conta?';

    if (Platform.OS === 'web') {
      const confirmou = window.confirm(texto);
      if (confirmou) executar();
    } else {
      Alert.alert('Encerrar Sessão', texto, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: executar },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Meu Perfil</Text>
        <Text style={styles.headerSubtitulo}>Dados cadastrais e status ministerial</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CARD PRINCIPAL DO USUÁRIO */}
        <View style={styles.cardPerfil}>
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarTexto}>{getIniciais(user?.nome)}</Text>
          </View>
          <Text style={styles.nomeUsuario}>{user?.nome || 'Voluntário'}</Text>
          <Text style={styles.emailUsuario}>{user?.email || 'email@igreja.com.br'}</Text>

          <View style={styles.cargoChip}>
            <Flame size={13} color="#FF6B00" />
            <Text style={styles.cargoChipTexto}>{user?.role || 'MINISTRO'}</Text>
          </View>
        </View>

        {/* AÇÕES DE GESTÃO DA CONTA */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Gerenciar Conta</Text>

          <View style={styles.cardAcoesPerfil}>
            <TouchableOpacity
              style={styles.itemAcaoLinha}
              onPress={abrirModalDados}
              activeOpacity={0.7}
            >
              <View style={styles.itemAcaoIcone}>
                <Edit3 size={18} color="#FF6B00" />
              </View>
              <View style={styles.itemAcaoTexts}>
                <Text style={styles.itemAcaoTitulo}>Editar Meus Dados</Text>
                <Text style={styles.itemAcaoSubtitulo}>Nome, e-mail e telefone de contato</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divisorLinha} />

            <TouchableOpacity
              style={styles.itemAcaoLinha}
              onPress={abrirModalSenha}
              activeOpacity={0.7}
            >
              <View style={styles.itemAcaoIcone}>
                <KeyRound size={18} color="#FF6B00" />
              </View>
              <View style={styles.itemAcaoTexts}>
                <Text style={styles.itemAcaoTitulo}>Alterar Senha de Acesso</Text>
                <Text style={styles.itemAcaoSubtitulo}>Definir uma nova senha segura</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* INFORMAÇÕES MINISTERIAIS */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Vínculo Institucional</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Building2 size={18} color="#FF6B00" />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Congregação / Unidade</Text>
                <Text style={styles.infoValor}>
                  {user?.nomeEmpresa || 'Luz para os Povos-Noroeste'}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Shield size={18} color="#FF6B00" />
              <View style={styles.infoTexts}>
                <Text style={styles.infoLabel}>Nível de Permissão</Text>
                <Text style={styles.infoValor}>
                  {user?.role === 'SUPER_ADMIN'
                    ? 'Super Administrador'
                    : user?.role === 'ADMIN'
                    ? 'Líder Ministerial (Admin)'
                    : 'Ministro / Músico Voluntário'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* DIRETRIZES DO LOUVOR */}
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Diretrizes do Louvor</Text>

          <View style={styles.regrasCard}>
            <View style={styles.regraItem}>
              <CalendarCheck size={16} color="#22c55e" />
              <Text style={styles.regraTexto}>
                <Text style={{ fontWeight: '700', color: '#ffffff' }}>Cultos Dominicais:</Text>{' '}
                Escalas apenas aos domingos (culto matutino e culto da noite).
              </Text>
            </View>

            <View style={styles.regraItem}>
              <CheckCircle size={16} color="#f59e0b" />
              <Text style={styles.regraTexto}>
                <Text style={{ fontWeight: '700', color: '#ffffff' }}>Prazo até dia 25:</Text>{' '}
                Marque sua disponibilidade para evitar fallback automático.
              </Text>
            </View>

            <View style={styles.regraItem}>
              <HelpCircle size={16} color="#94a3b8" />
              <Text style={styles.regraTexto}>
                <Text style={{ fontWeight: '700', color: '#ffffff' }}>Confirmações:</Text>{' '}
                Confirme com antecedência ou comunique o líder em caso de imprevisto.
              </Text>
            </View>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.btnLogout, saindo && styles.btnLogoutDisabled]}
          onPress={handleLogout}
          disabled={saindo}
          activeOpacity={0.8}
        >
          {saindo ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <>
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.btnLogoutTexto}>Encerrar Sessão</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versaoTexto}>Hope Escala Pro • Versão Mobile 1.0</Text>
      </ScrollView>

      {/* MODAL 1: EDITAR DADOS */}
      <Modal
        visible={modalDadosAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalDadosAberto(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>Editar Dados Pessoais</Text>
                <Text style={styles.modalSubtitulo}>Mantenha seus dados de contato em dia</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalDadosAberto(false)}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Seu nome"
                    placeholderTextColor="#475569"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seuemail@igreja.com.br"
                    placeholderTextColor="#475569"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>WhatsApp / Telefone</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="(00) 00000-0000"
                    placeholderTextColor="#475569"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalDadosAberto(false)}
              >
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSalvar, salvandoDados && styles.btnDesabilitado]}
                onPress={handleSalvarDados}
                disabled={salvandoDados}
              >
                {salvandoDados ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Save size={16} color="#ffffff" />
                    <Text style={styles.btnSalvarTexto}>Salvar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ALTERAR SENHA */}
      <Modal
        visible={modalSenhaAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalSenhaAberto(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitulo}>Alterar Senha</Text>
                <Text style={styles.modalSubtitulo}>Defina sua nova credencial de segurança</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalSenhaAberto(false)}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Senha Atual</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={senhaAtual}
                    onChangeText={setSenhaAtual}
                    placeholder="Sua senha atual"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <KeyRound size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={novaSenha}
                    onChangeText={setNovaSenha}
                    placeholder="Mínimo 6 dígitos"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <KeyRound size={16} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    value={confirmaSenha}
                    onChangeText={setConfirmaSenha}
                    placeholder="Repita a nova senha"
                    placeholderTextColor="#475569"
                    secureTextEntry
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalSenhaAberto(false)}
              >
                <Text style={styles.btnCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSalvar, salvandoSenha && styles.btnDesabilitado]}
                onPress={handleSalvarSenha}
                disabled={salvandoSenha}
              >
                {salvandoSenha ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Save size={16} color="#ffffff" />
                    <Text style={styles.btnSalvarTexto}>Atualizar Senha</Text>
                  </>
                )}
              </TouchableOpacity>
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
    paddingBottom: 14,
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
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
  },
  cardPerfil: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTexto: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  nomeUsuario: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  emailUsuario: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  cargoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  cargoChipTexto: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: 0.5,
  },
  secao: {
    gap: 8,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  cardAcoesPerfil: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  itemAcaoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemAcaoIcone: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemAcaoTexts: {
    flex: 1,
  },
  itemAcaoTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemAcaoSubtitulo: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  divisorLinha: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 64,
  },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  infoValor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 1,
  },
  regrasCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  regraItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  regraTexto: {
    flex: 1,
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  btnLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    height: 48,
    borderRadius: 14,
    marginTop: 8,
  },
  btnLogoutDisabled: {
    opacity: 0.5,
  },
  btnLogoutTexto: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  versaoTexto: {
    textAlign: 'center',
    fontSize: 11,
    color: '#475569',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
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
  modalTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalSubtitulo: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  formContainer: {
    gap: 12,
    marginBottom: 18,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  modalBotoes: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancelar: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelarTexto: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  btnSalvar: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnDesabilitado: {
    opacity: 0.6,
  },
  btnSalvarTexto: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
