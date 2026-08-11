/**
 * Fundo da tela de login: AURORA IN-HAUS.
 *
 * Luz, não geometria. Um campo navy profundo com auroras teal que derivam
 * lentamente atrás do card, mais um grão finíssimo para o gradiente não "bandar".
 * Sem linhas, sem pontos soltos — só uma atmosfera calma que valoriza a marca.
 *
 * CSS puro (sem canvas): leve e nítido. Respeita prefers-reduced-motion (as
 * auroras ficam paradas, ainda compondo a cena). Mantém o nome/props anteriores
 * para a página de login não precisar mudar.
 */

// Grão sutil (feTurbulence) como data-URI — quebra o banding do gradiente.
const GRAO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export function FluxoCanvas({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        overflow: "hidden",
        background: "radial-gradient(120% 120% at 50% 0%, #002443 0%, #00121F 70%)",
      }}
    >
      {/* auroras — blobs teal desfocados que derivam devagar */}
      <div className="inhaus-aurora inhaus-aurora-1" />
      <div className="inhaus-aurora inhaus-aurora-2" />
      <div className="inhaus-aurora inhaus-aurora-3" />

      {/* grão */}
      <div
        style={{
          position: "absolute",
          inset: "-30%",
          opacity: 0.32,
          mixBlendMode: "overlay",
          backgroundImage: `url("${GRAO}")`,
          backgroundRepeat: "repeat",
          pointerEvents: "none",
        }}
      />

      <style>{`
        .inhaus-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          will-change: transform;
        }
        .inhaus-aurora-1 {
          width: 58vw; height: 58vw; left: 4%; top: 2%;
          background: radial-gradient(circle, rgba(2,113,147,0.55), transparent 68%);
          animation: inhaus-aurora-drift-1 22s ease-in-out infinite;
        }
        .inhaus-aurora-2 {
          width: 52vw; height: 52vw; right: 0%; bottom: -6%;
          background: radial-gradient(circle, rgba(79,168,196,0.38), transparent 68%);
          animation: inhaus-aurora-drift-2 28s ease-in-out infinite;
        }
        .inhaus-aurora-3 {
          width: 40vw; height: 40vw; left: 34%; top: 30%;
          background: radial-gradient(circle, rgba(2,113,147,0.5), transparent 68%);
          animation: inhaus-aurora-drift-3 34s ease-in-out infinite;
        }
        @keyframes inhaus-aurora-drift-1 {
          0%, 100% { transform: translate(-6%, -4%) scale(1); }
          50%      { transform: translate(8%, 6%) scale(1.06); }
        }
        @keyframes inhaus-aurora-drift-2 {
          0%, 100% { transform: translate(5%, 3%) scale(1.04); }
          50%      { transform: translate(-8%, -5%) scale(1); }
        }
        @keyframes inhaus-aurora-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-5%, 5%) scale(1.12); }
        }
        @media (prefers-reduced-motion: reduce) {
          .inhaus-aurora { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
