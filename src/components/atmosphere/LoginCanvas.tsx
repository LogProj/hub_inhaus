"use client"

/**
 * Canvas WebGL reativo da tela de login — compõe, num único fragment shader,
 * as três camadas da atmosfera (gradiente de profundidade, malha de pontos,
 * aurora derivando) e reage ao mouse com retorno amortecido.
 *
 * Antes de instanciar qualquer coisa do `ogl`, testa se o navegador tem
 * WebGL. Se não tiver — ou se `prefers-reduced-motion` estiver ativo —
 * cai no fallback em CSS/SVG (`<Atmosphere intensidade="cheia" />`), sem
 * quebra visual nenhuma.
 *
 * Carregado pela página de login via `next/dynamic` com `ssr: false`.
 */

import { useEffect, useRef, useState } from "react"
import { Camera, Mesh, Program, Renderer, Transform, Triangle, Vec2, Vec3 } from "ogl"
import { Atmosphere } from "@/components/atmosphere/Atmosphere"
import { cn } from "@/lib/utils"

type LoginCanvasProps = {
  className?: string
}

type Modo = "verificando" | "webgl" | "fallback"

const VERTEX = /* glsl */ `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform vec3 uNavy;
  uniform vec3 uNavyDeep;
  uniform vec3 uTeal;
  uniform vec3 uTealBright;

  varying vec2 vUv;

  /* Hash determinístico — nada de aleatoriedade "viva" demais, mesma lógica
     de tabela fixa usada nas outras camadas de atmosfera em CSS/SVG. */
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    float aspecto = uResolution.x / uResolution.y;
    vec2 uv = vec2(vUv.x * aspecto, vUv.y);
    vec2 mouse = vec2(uMouse.x * aspecto, uMouse.y);

    /* Camada 1 — gradiente radial de profundidade (navy -> navy-deep). */
    vec2 centroGradiente = vec2(0.3 * aspecto, 0.8);
    float distGradiente = distance(uv, centroGradiente) / (1.1 * aspecto);
    vec3 cor = mix(uNavy, uNavyDeep, clamp(distGradiente, 0.0, 1.0));

    /* Camada 2 — malha de pontos, com brilho e deslocamento perto do mouse. */
    float espacamento = 0.05;
    vec2 grade = uv / espacamento;
    vec2 celula = floor(grade);
    vec2 centroCelula = celula + 0.5;
    vec2 offset = grade - centroCelula;

    float aleatorio = hash(celula);
    float pulso = 0.5 + 0.5 * sin(uTime * (0.4 + aleatorio * 0.6) + aleatorio * 6.2831853);

    float distMouse = distance(uv, mouse);
    float influencia = smoothstep(0.18, 0.0, distMouse);
    vec2 direcao = uv - mouse;
    float distSegura = max(length(direcao), 0.0001);
    vec2 deslocamento = (direcao / distSegura) * influencia * 0.35;

    float distPonto = length(offset - deslocamento * 0.3);
    float ponto = smoothstep(0.14, 0.02, distPonto);

    float brilhoBase = mix(0.05, 0.22, pulso);
    float brilho = brilhoBase + influencia * 0.5;
    vec3 corPonto = mix(vec3(1.0), uTealBright, influencia);
    cor += corPonto * ponto * brilho;

    /* Camada 3 — dois blobs de aurora derivando com o tempo. */
    vec2 blob1 = vec2(0.65 * aspecto, 0.55) + vec2(sin(uTime * 0.06), cos(uTime * 0.05)) * 0.12;
    vec2 blob2 = vec2(0.2 * aspecto, 0.3) + vec2(cos(uTime * 0.045), sin(uTime * 0.055)) * 0.1;

    float aurora1 = exp(-pow(distance(uv, blob1) * 2.2, 2.0));
    float aurora2 = exp(-pow(distance(uv, blob2) * 2.6, 2.0));

    cor += uTeal * aurora1 * 0.22;
    cor += uTealBright * aurora2 * 0.16;

    gl_FragColor = vec4(cor, 1.0);
  }
`

/** Converte h/s/l (graus, 0–1, 0–1) em r/g/b normalizado (0–1). */
function hslParaRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = (((h % 360) + 360) % 360) / 360
  if (s === 0) return [l, l, l]

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return [hue2rgb(hn + 1 / 3), hue2rgb(hn), hue2rgb(hn - 1 / 3)]
}

/** Lê um token de cor HSL do CSS (`"205 100% 13%"`) e devolve RGB 0–1. */
function lerCorToken(nomeVariavel: string): [number, number, number] {
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(nomeVariavel).trim()
  const partes = bruto.split(/\s+/)
  const h = parseFloat(partes[0] ?? "0")
  const s = parseFloat((partes[1] ?? "0%").replace("%", "")) / 100
  const l = parseFloat((partes[2] ?? "0%").replace("%", "")) / 100
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return [0, 0, 0]
  return hslParaRgb(h, s, l)
}

export function LoginCanvas({ className }: LoginCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modo, setModo] = useState<Modo>("verificando")

  // Decide o modo: reduced motion e falta de WebGL levam direto ao fallback.
  useEffect(() => {
    const reduzida = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduzida) {
      setModo("fallback")
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      setModo("fallback")
      return
    }

    const contextoTeste = canvas.getContext("webgl2") || canvas.getContext("webgl")
    setModo(contextoTeste ? "webgl" : "fallback")
  }, [])

  // Monta a cena ogl só quando o modo "webgl" é confirmado.
  useEffect(() => {
    if (modo !== "webgl") return

    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const renderer = new Renderer({
      canvas,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: true,
      antialias: true,
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: VERTEX,
      fragment: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new Vec2(0.5, 0.5) },
        uResolution: { value: new Vec2(canvas.width || 1, canvas.height || 1) },
        uNavy: { value: new Vec3(...lerCorToken("--navy")) },
        uNavyDeep: { value: new Vec3(...lerCorToken("--navy-deep")) },
        uTeal: { value: new Vec3(...lerCorToken("--teal")) },
        uTealBright: { value: new Vec3(...lerCorToken("--teal-bright")) },
      },
    })

    const scene = new Transform()
    const mesh = new Mesh(gl, { geometry, program })
    mesh.setParent(scene)
    const camera = new Camera(gl)

    const ajustarTamanho = (largura: number, altura: number) => {
      if (largura <= 0 || altura <= 0) return
      renderer.setSize(largura, altura)
      const uResolution = program.uniforms.uResolution.value as Vec2
      uResolution.set(gl.canvas.width, gl.canvas.height)
    }
    const retangulo = container.getBoundingClientRect()
    ajustarTamanho(retangulo.width, retangulo.height)

    const resizeObserver = new ResizeObserver((entradas) => {
      const entrada = entradas[0]
      if (!entrada) return
      const { width, height } = entrada.contentRect
      ajustarTamanho(width, height)
    })
    resizeObserver.observe(container)

    // Mouse com lerp de 0.06/frame para o retorno amortecido.
    const mouseAlvo = new Vec2(0.5, 0.5)
    const mouseAtual = new Vec2(0.5, 0.5)
    const aoMoverMouse = (evento: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const x = (evento.clientX - rect.left) / rect.width
      const y = 1 - (evento.clientY - rect.top) / rect.height
      mouseAlvo.set(x, y)
    }
    window.addEventListener("pointermove", aoMoverMouse)

    // Loop de render — pausa completamente quando a aba está oculta.
    let rafId = 0
    const tick = (agora: number) => {
      rafId = requestAnimationFrame(tick)
      program.uniforms.uTime.value = agora * 0.001
      mouseAtual.lerp(mouseAlvo, 0.06)
      const uMouse = program.uniforms.uMouse.value as Vec2
      uMouse.set(mouseAtual.x, mouseAtual.y)
      renderer.render({ scene, camera })
    }
    const iniciarLoop = () => {
      if (rafId) return
      rafId = requestAnimationFrame(tick)
    }
    const pararLoop = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    }
    const aoMudarVisibilidade = () => {
      if (document.hidden) pararLoop()
      else iniciarLoop()
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade)
    if (!document.hidden) iniciarLoop()

    return () => {
      pararLoop()
      document.removeEventListener("visibilitychange", aoMudarVisibilidade)
      window.removeEventListener("pointermove", aoMoverMouse)
      resizeObserver.disconnect()
      // Evita vazar o contexto WebGL ao navegar para fora da tela de login.
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [modo])

  return (
    <div ref={containerRef} className={cn("absolute inset-0", className)}>
      {modo !== "fallback" && (
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      )}
      {modo === "fallback" && <Atmosphere intensidade="cheia" />}
    </div>
  )
}
