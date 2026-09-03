// Nomes de headers internos compartilhados entre o middleware (Edge) e os Server
// Components (Node). É um módulo FOLHA, sem dependências, justamente para poder ser
// importado pelo middleware sem arrastar nada para o bundle do Edge.
//
// POR QUE existe: o middleware PUBLICA o caminho da requisição num header e o layout/
// guards CONSOMEM esse header para saber "onde o usuário está" (trava do CLIENTE e o
// destino do refresh de sessão). Se produtor e consumidor usarem strings diferentes, o
// valor chega sempre nulo e o refresh joga o usuário para a Home. Manter UMA constante
// impede essa divergência silenciosa.

/** Caminho da requisição, injetado pelo middleware e lido pelos Server Components. */
export const HEADER_PATHNAME = "x-pathname"
