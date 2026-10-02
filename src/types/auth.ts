export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  role?: string | null;
  empresaId?: number | null;
  nomeEmpresa?: string | null;
}

export interface LoginResponseDTO {
  token: string;
  tipo?: string;
  usuario?: UsuarioLogado;
  // Campos caso seu backend retorne diretamente na raiz do login:
  id?: number;
  nome?: string;
  email?: string;
  empresaId?: number;
  nomeEmpresa?: string;
  roles?: string[];
}

export interface AuthContextData {
  user: UsuarioLogado | null;
  token: string | null;
  loading: boolean;
  login: (loginOuEmail: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}
