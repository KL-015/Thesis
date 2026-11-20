"use client"

/**
 * Liquid Glass Navbar — "Waterline"
 * A liquid pill indicator: the active drop stretches toward the selected tab,
 * splits into droplets on multi-tab jumps, and merges back with a ripple.
 * Supports both horizontal and vertical orientations without altering caller icons.
 */

import * as React from "react"

export type NimbusFx = "plane" | "drop" | "spin" | "glow" | "wave" | "pop" | "none"

export type LiquidNavItem = {
  id?: string
  label: string
  href?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  tooltip?: string
  /** Icon animation scene (defaults to "none" to preserve existing icon behavior) */
  fx?: NimbusFx
}

export type LiquidNavbarProps = {
  items?: LiquidNavItem[]
  defaultActive?: number
  active?: number
  onChange?: (index: number, item: LiquidNavItem) => void
  /** "light" water for bright backgrounds, "dark" for dark ones */
  tone?: "light" | "dark"
  /** horizontal pill or vertical sidebar pill */
  orientation?: "horizontal" | "vertical"
  /** icons only */
  compact?: boolean
  /** soft synthesized "plip" on tap (no audio files) */
  sound?: boolean
  /** disable built-in hover/icon scale or animations when preserving custom icons */
  preserveIcons?: boolean
  className?: string
  itemClassName?: string
  style?: React.CSSProperties
}

const PAD = 14 // canvas bleed around the pill, for shadows and ripples

/* ---------- styles ---------- */
const NIMBUS_CSS = `
.nimbus-nav{--n-tint:rgba(255,255,255,.14);--n-fg:#0B132B;--n-fg-soft:rgba(11,19,43,.6);--n-rim:rgba(255,255,255,.7);
  position:relative;display:inline-flex;align-items:center;gap:2px;padding:6px;border-radius:999px;isolation:isolate;
  font-family:ui-sans-serif,-apple-system,"SF Pro Text","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent}
.nimbus-nav[data-orientation="vertical"]{flex-direction:column;gap:10px;padding:12px 8px;border-radius:24px}
.nimbus-nav[data-tone="dark"]{--n-tint:rgba(255,255,255,.12);--n-fg:#FFFFFF;--n-fg-soft:rgba(255,255,255,.72);--n-rim:rgba(255,255,255,.28)}
.nimbus-glass{position:absolute;inset:0;border-radius:inherit;z-index:-2;overflow:hidden;background:var(--n-tint);
  -webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);
  box-shadow:inset 0 1px 1px var(--n-rim),inset 0 0 0 1px rgba(255,255,255,.22),0 15px 40px rgba(0,0,0,.25)}
.nimbus-nav[data-refract="on"] .nimbus-glass{-webkit-backdrop-filter:url(#nimbus-refract) blur(14px) saturate(1.4);backdrop-filter:url(#nimbus-refract) blur(14px) saturate(1.4)}
.nimbus-water{position:absolute;left:${-PAD}px;top:${-PAD}px;z-index:-1;pointer-events:none}
.nimbus-nav[data-gl="off"] .nimbus-water{display:none}
.nimbus-drop{display:none;position:absolute;top:6px;bottom:6px;left:0;border-radius:999px;z-index:-1;pointer-events:none;will-change:transform,width,height;
  background:radial-gradient(120% 140% at 30% 0%,rgba(255,255,255,.65),rgba(255,255,255,0) 55%),rgba(255,255,255,.26);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.85),inset 0 -2px 6px rgba(56,189,248,.22),inset 0 0 0 1px rgba(255,255,255,.45),0 6px 16px -6px rgba(0,70,140,.45)}
.nimbus-nav[data-orientation="vertical"] .nimbus-drop{border-radius:16px}
.nimbus-nav[data-gl="off"] .nimbus-drop{display:block}
.nimbus-item{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 16px;border:0;border-radius:999px;background:none;color:var(--n-fg-soft);
  font-family:inherit;font-weight:500;font-size:14px;line-height:1;letter-spacing:-.01em;text-decoration:none;cursor:pointer;transition:color .25s}
.nimbus-nav[data-orientation="vertical"] .nimbus-item{width:40px;height:40px;padding:0;border-radius:16px}
.nimbus-item:hover,.nimbus-item[aria-current="page"]{color:var(--n-fg)}
.nimbus-item:hover{z-index:10}
.nimbus-item:focus-visible{outline:2px solid #00A2FF;outline-offset:2px}
.nv-ico{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none}
.nimbus-nav[data-compact="true"]:not([data-orientation="vertical"]) .nimbus-item{padding:0 13px}
.nimbus-nav[data-compact="true"] .nimbus-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:768px){
  .nimbus-glass{-webkit-backdrop-filter:none !important;backdrop-filter:none !important;background:rgba(15,23,42,.72)}
}
@media (prefers-reduced-motion:reduce){.nv-ico svg{transition:none}}
`

/* ---------- the water shader ---------- */
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uDark;uniform float uAmb;
uniform float uVert;uniform float uRadius;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){
  p-=B.xy;
  if(uVert>0.5){p.x/=sy;p.y=max(abs(p.y)-B.z,0.);}
  else{p.y/=sy;p.x=max(abs(p.x)-B.z,0.);}
  return(length(p)-B.w)*min(1.,sy);
}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;float r=uRadius>0.?min(uRadius,min(h.x,h.y)):min(h.x,h.y);return sdRB(p-uPill.xy-h,h,r);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 float mAx=mix(p.x,p.y,uVert);float cAx=mix(p.y,p.x,uVert);
 w+=uAmb*(sin(mAx*.05+uTime*1.2)*.45+sin(mAx*.13-uTime*.85+cAx*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,min(uPill.z,uPill.w)*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+mix(p.x,p.y,uVert)*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
 vec3 c=vec3(0.,.14,.36)*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 tint=mix(vec3(.80,.95,1.),vec3(.55,.82,1.),uDark);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.28+.15*body)*(1.-.28*uDark);vec3 dc=mix(tint,vec3(1.),body*.6);
 float la=rim*.22;vec3 lc=mix(vec3(0.,.42,.78),vec3(.1,.55,.95),uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`

type Body = { x: number; v: number }
type Sat = { m: number; c: number; vm: number; vc: number; r: number; k: number }
type Rip = { x: number; y: number; age: number; amp: number }

function makeState() {
  return {
    a: { x: 0, v: 0 } as Body,
    b: { x: 0, v: 0 } as Body,
    sy: { s: 1, v: 0 },
    lead: 0 as 0 | 1,
    lagFrom: 0,
    sats: [] as Sat[],
    rips: [] as Rip[],
    t: { pos: 0, cross: 0, q: 0, r: 20 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    visible: true,
    reduce: false,
    coarse: false,
    raf: 0,
    last: 0,
    time: 0,
    glc: null as null | { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> },
  }
}

function initGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }) as WebGLRenderingContext | null
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const p = gl.createProgram()!
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
  gl.useProgram(p)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(p, "a")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u: Record<string, WebGLUniformLocation | null> = {}
  for (const n of ["uRes", "uDpr", "uTime", "uPill", "uBlob", "uSy", "uRip", "uMouse", "uDark", "uAmb", "uVert", "uRadius"]) {
    u[n] = gl.getUniformLocation(p, n)
  }
  return { gl, u }
}

function supportsRefraction() {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false
  const ua = navigator.userAgent
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && !!(CSS as any).supports?.("backdrop-filter", "url(#a)")
}

export function LiquidNavbar({
  items = [],
  defaultActive = 0,
  active,
  onChange,
  tone = "dark",
  orientation = "horizontal",
  compact,
  sound = false,
  className,
  itemClassName,
  style,
}: LiquidNavbarProps) {
  const [inner, setInner] = React.useState(defaultActive)
  const current = active ?? inner
  const vertical = orientation === "vertical"
  const verticalRef = React.useRef(vertical)
  verticalRef.current = vertical

  const navRef = React.useRef<HTMLElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const dropRef = React.useRef<HTMLSpanElement>(null)
  const itemRefs = React.useRef<(HTMLElement | null)[]>([])
  const audio = React.useRef<AudioContext | null>(null)
  const st = React.useRef(makeState())
  const [gl, setGl] = React.useState<"on" | "off">("on")
  const [refract, setRefract] = React.useState(false)
  const dark = tone === "dark" ? 1 : 0
  const darkRef = React.useRef(dark)
  darkRef.current = dark

  /* ---- drawing ---- */
  const draw = React.useCallback(() => {
    const s = st.current
    const T = s.t
    const isVert = verticalRef.current
    const sep = Math.abs(s.a.x - s.b.x)
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1)
    const r = T.r * (1 - 0.3 * thin)
    if (s.glc) {
      const { gl: g, u } = s.glc
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight)
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2)
      g.uniform1f(u.uDpr, dpr)
      g.uniform1f(u.uTime, s.time)
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h)
      g.uniform1f(u.uVert, isVert ? 1 : 0)
      g.uniform1f(u.uRadius, isVert ? 24 : 0)
      const blobs = new Float32Array(24)
      const sy = new Float32Array(6).fill(1)
      const head = s.lead === 0 ? s.a : s.b
      const tail = s.lead === 0 ? s.b : s.a
      const hx = isVert ? T.cross : head.x
      const hy = isVert ? head.x : T.cross
      const tx = isVert ? T.cross : tail.x
      const ty = isVert ? tail.x : T.cross
      blobs.set(
        [
          hx,
          hy,
          s.q * (1 - 0.25 * thin),
          T.r * (1 - 0.12 * thin),
          tx,
          ty,
          s.q * (1 - 0.8 * thin),
          T.r * (1 - 0.5 * thin),
        ],
        0
      )
      sy[0] = sy[1] = s.sy.s
      s.sats.slice(0, 4).forEach((d, i) => {
        blobs.set([isVert ? d.c : d.m, isVert ? d.m : d.c, 0, d.r], 8 + i * 4)
      })
      g.uniform4fv(u.uBlob, blobs)
      g.uniform1fv(u.uSy, sy)
      const rips = new Float32Array(24)
      s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4))
      g.uniform4fv(u.uRip, rips)
      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s)
      g.uniform1f(u.uDark, darkRef.current)
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.drawArrays(g.TRIANGLES, 0, 3)
    } else if (dropRef.current) {
      if (isVert) {
        const top = Math.min(s.a.x, s.b.x) - s.q - r - PAD
        const height = sep + 2 * (s.q + r)
        const left = T.cross - T.r - PAD
        dropRef.current.style.top = "0px"
        dropRef.current.style.bottom = ""
        dropRef.current.style.left = `${left}px`
        dropRef.current.style.width = `${T.r * 2}px`
        dropRef.current.style.height = `${height}px`
        dropRef.current.style.transform = `translateY(${top}px) scaleX(${s.sy.s})`
      } else {
        const left = Math.min(s.a.x, s.b.x) - s.q - r - PAD
        const width = sep + 2 * (s.q + r)
        dropRef.current.style.left = "0px"
        dropRef.current.style.top = "6px"
        dropRef.current.style.bottom = "6px"
        dropRef.current.style.height = ""
        dropRef.current.style.width = `${width}px`
        dropRef.current.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`
      }
    }
  }, [])

  /* ---- physics ---- */
  const step = React.useCallback((dt: number, now: number) => {
    const s = st.current
    const T = s.t
    const isVert = verticalRef.current
    s.time += dt
    s.q += (T.q - s.q) * Math.min(1, dt * 12)
    const bodies = [s.a, s.b]
    let still = true
    const axisLen = isVert ? s.h : s.w

    if (s.reduce) {
      s.a.x = s.b.x = T.pos
      s.a.v = s.b.v = 0
      s.sy.s = 1
      s.sats = []
    } else {
      bodies.forEach((B, i) => {
        const lead = i === s.lead
        const k = lead ? 210 : 72
        const c = lead ? 25 : 13
        const f = !lead && now < s.lagFrom ? 0.08 : 1
        B.v += (k * (T.pos - B.x) - c * B.v) * dt * f
        B.x += B.v * dt
        const lo = PAD + 6 + s.q + T.r - 3
        const hi = PAD + axisLen - 6 - s.q - T.r + 3
        if (hi > lo && (B.x < lo || B.x > hi)) {
          s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016
          B.x = Math.max(lo, Math.min(hi, B.x))
          B.v *= -0.25
        }
        if (Math.abs(T.pos - B.x) > 0.3 || Math.abs(B.v) > 3) still = false
      })
      const L = bodies[s.lead]
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1)
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt
      s.sy.s += s.sy.v * dt
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false

      // Break the neck: spawn satellite droplets between head and tail
      const sep = Math.abs(s.a.x - s.b.x)
      const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (s.q + T.r) || 1), 1))
      if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
        s.split = true
        const lo = bodies[1 - s.lead]
        const hi = bodies[s.lead]
        ;[0.3, 0.5, 0.72].forEach((t, j) => {
          s.sats.push({
            m: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
            c: T.cross + (Math.random() - 0.5) * 10,
            vm: (lo.v + hi.v) * 0.45,
            vc: (Math.random() - 0.5) * 60,
            r: 5 + Math.random() * 3 - j * 0.5,
            k: 70 + Math.random() * 90,
          })
        })
      }

      s.sats = s.sats.filter((d) => {
        d.vm += (d.k * (T.pos - d.m) - 9 * d.vm) * dt
        d.vc += (90 * (T.cross - d.c) - 7 * d.vc) * dt
        d.m += d.vm * dt
        d.c += d.vc * dt
        d.m = Math.max(PAD + 8 + d.r, Math.min(PAD + axisLen - 8 - d.r, d.m))
        d.c = Math.max(T.cross - T.r + d.r, Math.min(T.cross + T.r - d.r, d.c))
        if (Math.abs(T.pos - d.m) < T.q + T.r * 0.5) d.r -= dt * 26
        return d.r > 0.6
      })
      if (s.sats.length) still = false
    }

    if (s.moving && still) {
      s.moving = false
      if (s.split || !s.reduce) {
        s.rips.push({
          x: isVert ? T.cross : T.pos,
          y: isVert ? T.pos : T.cross,
          age: 0,
          amp: s.split ? 1.2 : 0.7,
        })
      }
    }
    s.rips.forEach((p) => (p.age += dt))
    s.rips = s.rips.filter((p) => p.age < 2.4)
    const target = s.mouse.on ? 1 : 0
    s.mouse.s += (target - s.mouse.s) * Math.min(1, dt * 7)
  }, [])

  const loop = React.useCallback(() => {
    const s = st.current
    if (s.raf) return
    s.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30)
      s.last = now
      step(dt, now)
      draw()
      const busy = s.moving || s.rips.length > 0 || s.sats.length > 0 || s.mouse.s > 0.01
      // Desktop runs ambient liquid waves while visible; coarse/touch & reduced-motion stop idle RAF cleanly once settled
      if (s.visible && ((!s.reduce && !s.coarse) || busy)) {
        s.raf = requestAnimationFrame(tick)
      } else {
        s.raf = 0
      }
    }
    s.raf = requestAnimationFrame(tick)
  }, [draw, step])

  /* ---- layout ---- */
  const measure = React.useCallback(() => {
    const nav = navRef.current
    const el = itemRefs.current[current]
    if (!nav || !el) return
    const s = st.current
    const isVert = verticalRef.current
    s.w = nav.offsetWidth
    s.h = nav.offsetHeight
    const T = s.t
    if (isVert) {
      T.r = el.offsetWidth / 2
      T.q = Math.max(0, el.offsetHeight / 2 - T.r)
      T.cross = PAD + el.offsetLeft + el.offsetWidth / 2
    } else {
      T.r = el.offsetHeight / 2
      T.q = Math.max(0, el.offsetWidth / 2 - T.r)
      T.cross = PAD + el.offsetTop + el.offsetHeight / 2
    }
    const nPos = isVert
      ? PAD + el.offsetTop + el.offsetHeight / 2
      : PAD + el.offsetLeft + el.offsetWidth / 2

    if (!s.ready) {
      s.a.x = s.b.x = nPos
      s.q = T.q
      s.ready = true
    } else if (Math.abs(nPos - T.pos) > 0.5) {
      s.lead = Math.abs(nPos - s.a.x) <= Math.abs(nPos - s.b.x) ? 0 : 1
      s.lagFrom = performance.now() + 70
      s.moving = true
      s.split = false
    }
    T.pos = nPos

    const cv = canvasRef.current
    if (cv) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = s.w + PAD * 2
      const Hh = s.h + PAD * 2
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(Hh * dpr)
        cv.style.width = `${W}px`
        cv.style.height = `${Hh}px`
      }
    }
    loop()
  }, [current, loop])

  React.useEffect(() => {
    setRefract(supportsRefraction())
    const s = st.current
    s.reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    s.coarse = !!window.matchMedia?.("(pointer: coarse)").matches
    const cv = canvasRef.current
    s.glc = cv ? initGL(cv) : null
    if (!s.glc) setGl("off")
    const lost = (e: Event) => {
      e.preventDefault()
      s.glc = null
      setGl("off")
    }
    cv?.addEventListener("webglcontextlost", lost)
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting
      if (s.visible) loop()
    })
    if (navRef.current) io.observe(navRef.current)
    const vis = () => {
      s.visible = document.visibilityState === "visible"
      if (s.visible) loop()
    }
    document.addEventListener("visibilitychange", vis)
    return () => {
      cv?.removeEventListener("webglcontextlost", lost)
      io.disconnect()
      document.removeEventListener("visibilitychange", vis)
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [loop])

  React.useLayoutEffect(() => {
    measure()
  }, [measure, items.length, compact, orientation])

  const measureRef = React.useRef(measure)
  measureRef.current = measure
  React.useEffect(() => {
    let lastW = -1
    let lastH = -1
    const ro = new ResizeObserver(() => {
      const w = navRef.current?.offsetWidth ?? 0
      const h = navRef.current?.offsetHeight ?? 0
      if (w !== lastW || h !== lastH) {
        lastW = w
        lastH = h
        st.current.ready = false
        measureRef.current()
      }
    })
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    loop()
  }, [tone, loop])

  /* ---- interaction ---- */
  const local = (clientX: number, clientY: number) => {
    const r = navRef.current!.getBoundingClientRect()
    return { x: clientX - r.left + PAD, y: clientY - r.top + PAD }
  }

  const ripple = (x: number, y: number, amp: number) => {
    const s = st.current
    if (s.reduce) return
    s.rips.push({ x, y, age: 0, amp })
    loop()
  }

  const plip = () => {
    if (!sound) return
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      const ctx = (audio.current ||= new AC())
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      o.frequency.setValueAtTime(420 + Math.random() * 80, t)
      o.frequency.exponentialRampToValueAtTime(1500, t + 0.07)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.18)
    } catch {}
  }

  const select = (i: number) => {
    plip()
    if (i !== current) {
      if (active === undefined) setInner(i)
      onChange?.(i, items[i])
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const nextKeys = vertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight", "ArrowDown"]
    const prevKeys = vertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft", "ArrowUp"]
    if (!nextKeys.includes(e.key) && !prevKeys.includes(e.key)) return
    e.preventDefault()
    const stepDir = nextKeys.includes(e.key) ? 1 : -1
    const n = (current + stepDir + items.length) % items.length
    select(n)
    itemRefs.current[n]?.focus()
  }

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return
    const p = local(e.clientX, e.clientY)
    const s = st.current
    s.mouse.x = p.x
    s.mouse.y = p.y
    s.mouse.on = true
    loop()
  }

  return (
    <nav
      ref={navRef as any}
      className={["nimbus-nav", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-orientation={orientation}
      data-gl={gl}
      data-compact={compact === undefined ? undefined : String(compact)}
      data-refract={refract ? "on" : "off"}
      aria-label="Main"
      onKeyDown={onKeyDown}
      onPointerMove={onMove}
      onPointerLeave={() => {
        st.current.mouse.on = false
        loop()
      }}
      onPointerDown={(e) => {
        const p = local(e.clientX, e.clientY)
        ripple(p.x, p.y, 0.8)
      }}
      style={style}
    >
      <style dangerouslySetInnerHTML={{ __html: NIMBUS_CSS }} />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="nimbus-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="60" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span className="nimbus-glass" aria-hidden="true" />
      <canvas className="nimbus-water" ref={canvasRef} aria-hidden="true" />
      <span className="nimbus-drop" ref={dropRef} aria-hidden="true" />
      {items.map((it, i) => {
        const props = {
          ref: (el: HTMLElement | null) => {
            itemRefs.current[i] = el
          },
          className: ["nimbus-item group", itemClassName].filter(Boolean).join(" "),
          "aria-current": i === current ? ("page" as const) : undefined,
          onClick: () => select(i),
        }
        const content = (
          <>
            {it.tooltip && (
              <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-semibold rounded-xl shadow-2xl border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 backdrop-blur-xl flex flex-col items-center">
                <span>{it.tooltip}</span>
                <span className="w-2 h-2 bg-slate-900/95 border-r border-b border-white/20 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
              </span>
            )}
            {it.icon && <span className="nv-ico">{it.icon}</span>}
            {it.badge}
            <span className="nimbus-label">{it.label}</span>
          </>
        )
        return it.href ? (
          <a key={(it.id || it.label) + i} {...(props as any)} href={it.href} aria-label={it.label}>
            {content}
          </a>
        ) : (
          <button key={(it.id || it.label) + i} {...(props as any)} type="button" aria-label={it.label}>
            {content}
          </button>
        )
      })}
    </nav>
  )
}

/** alias for registries that import { Component } */
export { LiquidNavbar as Component }

export default LiquidNavbar
