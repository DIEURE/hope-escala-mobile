export interface MusicaRepertorio {
  id: number;
  escalaId: number;
  musicaId: number;
  nomeMusica: string;
  cantor?: string;
  tom?: string;
  bpm?: number;
  ordem?: number;
  youtubeVideoId?: string | null;
  cifraUrl?: string | null;
  cifra?: string | null;
  observacao?: string | null;
  substituida?: boolean;
}

export interface CultoAgenda {
  data: string; // Formato YYYY-MM-DD
  nome?: string;
  horario?: string;
}

export interface DetalhesEscala {
  id: number;
  dataEscala: string;
  departamentoNome?: string;
  nomeCultoManha?: string;
  nomeCultoNoite?: string;
  musicos?: Array<{
    id: number;
    nomeUsuario: string;
    instrumentoNome?: string;
  }>;
  musicas?: MusicaRepertorio[];
}
