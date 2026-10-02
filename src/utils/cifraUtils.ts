// Escalas cromáticas com sustenidos e bemóis
const NOTAS_SUSTENIDOS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTAS_BEMOIS     = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Mapeia equivalências para indexação uniforme
const MAPA_INDICES: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/**
 * Transpõe uma nota individual (ex: 'F#' -> 'G' com semitons = 1)
 */
export function transporNota(nota: string, semitons: number, usarBemol = false): string {
  const indiceOriginal = MAPA_INDICES[nota];
  if (indiceOriginal === undefined) return nota;

  let novoIndice = (indiceOriginal + semitons) % 12;
  if (novoIndice < 0) novoIndice += 12;

  const escala = usarBemol ? NOTAS_BEMOIS : NOTAS_SUSTENIDOS;
  return escala[novoIndice];
}

/**
 * Transpõe um acorde isolado, tratando baixo invertido (ex: G/B -> A/C#)
 */
export function transporAcorde(acorde: string, semitons: number): string {
  // Regex para capturar nota base, extensão e nota do baixo (ex: C#m7(9)/G#)
  const regexAcorde = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;
  const match = acorde.match(regexAcorde);

  if (!match) return acorde;

  const [, raiz, complemento, baixo] = match;
  const usarBemol = acorde.includes('b');

  const novaRaiz = transporNota(raiz, semitons, usarBemol);
  const novoBaixo = baixo ? `/${transporNota(baixo, semitons, usarBemol)}` : '';

  return `${novaRaiz}${complemento || ''}${novoBaixo}`;
}

/**
 * Detecta se uma palavra isolada é um acorde válido
 */
function ehAcorde(token: string): boolean {
  const tokenLimpo = token.replace(/[()[\]{}|,]/g, '').trim();
  const padraoAcorde = /^[A-G][#b]?(m|M|maj|min|dim|aug|sus|add)?[0-9]*(º)?(\/[A-G][#b]?)?$/;
  return padraoAcorde.test(tokenLimpo);
}

/**
 * Transpõe o texto completo da cifra preservando colunas, espaços e quebras de linha
 */
export function transporTextoCifra(textoCifra: string, semitons: number): string {
  if (!textoCifra || semitons === 0) return textoCifra;

  const linhas = textoCifra.split('\n');

  const linhasTranspostas = linhas.map((linha) => {
    // Mantém linhas de marcação intactas (ex: [Intro], [Verso 1])
    if (/^\s*\[.*\]\s*$/.test(linha)) {
      // Se houver acordes dentro da tag [Intro] E F# G, transpõe apenas os acordes
      return linha.replace(/\b([A-G][#b]?[^\s,\]]*)/g, (match) => {
        return ehAcorde(match) ? transporAcorde(match, semitons) : match;
      });
    }

    // Se a linha tem palavras comuns em português/inglês (mais de 3 letras sem padrão de acorde), não mexe
    const tokens = linha.split(/(\s+)/); // Preserva os espaçamentos exatamente onde estão
    const tokensValidos = tokens.filter(t => t.trim().length > 0);
    const totalAcordes = tokensValidos.filter(ehAcorde).length;

    // Se mais de 40% dos elementos da linha forem acordes, consideramos uma linha de cifra
    const ehLinhaDeCifra = tokensValidos.length > 0 && (totalAcordes / tokensValidos.length) >= 0.4;

    if (!ehLinhaDeCifra) {
      return linha;
    }

    return tokens
      .map((token) => {
        if (ehAcorde(token)) {
          return transporAcorde(token, semitons);
        }
        return token;
      })
      .join('');
  });

  return linhasTranspostas.join('\n');
}
