import { useEffect, useRef } from 'react';

// ── GLSL Vertex Shader ───────────────────────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// ── GLSL Fragment Shader — Iridescent Mesh Gradient ─────────────────────────
// Soft, slow-moving Perlin-like noise producing the Gemini iridescent aesthetic.
const FRAG = `
precision mediump float;
uniform float u_time;
uniform vec2  u_res;

// Hash / noise helpers
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0,0)), f - vec2(0,0)),
                 dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
             mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
                 dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p  = p * 2.3 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// HSL → RGB for iridescent colour cycling
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0,4,2), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float t  = u_time * 0.12;

  // Three overlapping fbm waves — slow, organic motion
  float n1 = fbm(uv * 1.8 + vec2(t * 0.6, t * 0.4));
  float n2 = fbm(uv * 2.4 + vec2(-t * 0.5, t * 0.7) + n1 * 0.6);
  float n3 = fbm(uv * 3.1 + vec2(t * 0.3, -t * 0.5) + n2 * 0.5);

  float pattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

  // Shift hue slowly across the iridescent palette
  // Base: deep navy-teal-purple, accent: cyan-violet-indigo
  float hue = 0.58 + pattern * 0.22 + t * 0.04;
  float sat = 0.55 + pattern * 0.25;
  float lit = 0.07 + pattern * 0.08;          // very dark, preserve readability

  vec3 col = hsl2rgb(vec3(hue, sat, lit));

  // Subtle radial vignette
  float vig = 1.0 - smoothstep(0.5, 1.2, length(uv));
  col *= vig;

  // Extra bright "orb" hotspot — top-left, like Gemini
  float orb1 = exp(-length(uv - vec2(-0.6, 0.55)) * 3.5) * 0.08;
  col += vec3(0.2, 0.5, 0.9) * orb1;

  // Bottom-right warm accent orb
  float orb2 = exp(-length(uv - vec2(0.7, -0.5)) * 4.0) * 0.06;
  col += vec3(0.6, 0.2, 0.9) * orb2;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, src: string, type: number): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function MeshGradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
    if (!gl) return;

    // Compile program
    const vert = compileShader(gl, VERT, gl.VERTEX_SHADER);
    const frag = compileShader(gl, FRAG, gl.FRAGMENT_SHADER);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes  = gl.getUniformLocation(prog, 'u_res');
    let raf: number;
    let start = performance.now();

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0, pointerEvents: 'none' }}
    />
  );
}
