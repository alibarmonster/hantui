/**
 * Small WebGL2 helpers for multipass effects that feed a frame into the next one (simulations,
 * feedback trails): float render targets, read/write ping-pong pairs (optionally with several
 * textures per target, written in one pass with multiple render targets) and full-screen passes.
 * Framework-free and browser only. `useShaderCanvas` stays the single-pass hook; this is for the
 * cases it doesn't cover.
 */

export interface TargetFormat {
  internalFormat: number;
  format: number;
  type: number;
}

export interface RenderTarget {
  framebuffer: WebGLFramebuffer;
  /** One texture per color attachment, in attachment order. */
  textures: WebGLTexture[];
  width: number;
  height: number;
}

export interface PingPong {
  /** The target to sample from this step. */
  readonly read: RenderTarget;
  /** The target to render into this step. */
  readonly write: RenderTarget;
  /** Swaps read and write after a pass. */
  swap(): void;
  /** Reallocates both targets (contents are cleared). */
  resize(width: number, height: number): void;
  /** Clears both targets to zero. */
  clear(): void;
  dispose(): void;
}

export interface Pass {
  program: WebGLProgram;
  /** A uniform's location (cached), or null if the shader doesn't use it. */
  uniform(name: string): WebGLUniformLocation | null;
  /** Binds the program and draws a full-screen triangle into `target` (or the canvas when null). */
  draw(target: RenderTarget | null, setUniforms?: (pass: Pass) => void): void;
  dispose(): void;
}

const VERTEX = /* glsl */ `#version 300 es
out vec2 v_uv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 v_uv;
`;

/** True on software WebGL (SwiftShader, llvmpipe), where multipass effects block the main thread. */
export function isSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
}

/**
 * A renderable half-float format (RGBA16F), or null when the device can't render to float
 * textures. Checked by actually completing a framebuffer, since extension support alone lies on
 * some drivers.
 */
export function halfFloatFormat(gl: WebGL2RenderingContext): TargetFormat | null {
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;
  const format: TargetFormat = { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT };
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) return null;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, 4, 4, 0, format.format, format.type, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(framebuffer);
  gl.deleteTexture(texture);
  return ok ? format : null;
}

/** A framebuffer with `attachments` textures of the given size and format. Linear filtering, clamped edges. */
export function createTarget(gl: WebGL2RenderingContext, width: number, height: number, format: TargetFormat, attachments = 1): RenderTarget {
  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  const textures: WebGLTexture[] = [];
  for (let i = 0; i < attachments; i++) {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format.internalFormat, width, height, 0, format.format, format.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, texture, 0);
    textures.push(texture);
  }
  gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, textures, width, height };
}

function deleteTarget(gl: WebGL2RenderingContext, target: RenderTarget) {
  target.textures.forEach((t) => gl.deleteTexture(t));
  gl.deleteFramebuffer(target.framebuffer);
}

/** A read/write pair of targets for passes that sample the previous step. */
export function createPingPong(gl: WebGL2RenderingContext, width: number, height: number, format: TargetFormat, attachments = 1): PingPong {
  let a = createTarget(gl, width, height, format, attachments);
  let b = createTarget(gl, width, height, format, attachments);
  return {
    get read() {
      return a;
    },
    get write() {
      return b;
    },
    swap() {
      [a, b] = [b, a];
    },
    resize(w, h) {
      deleteTarget(gl, a);
      deleteTarget(gl, b);
      a = createTarget(gl, w, h, format, attachments);
      b = createTarget(gl, w, h, format, attachments);
    },
    clear() {
      for (const t of [a, b]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    dispose() {
      deleteTarget(gl, a);
      deleteTarget(gl, b);
    },
  };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

let emptyVao: WeakMap<WebGL2RenderingContext, WebGLVertexArrayObject> | null = null;

/**
 * A full-screen pass from a fragment shader. Unless the source starts with `#version`, a header
 * with `precision highp float` and `in vec2 v_uv` (0–1) is prepended; declare your own `out`
 * variables (one per attachment of the target you draw into). Returns null if it doesn't compile.
 */
export function createPass(gl: WebGL2RenderingContext, fragment: string): Pass | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment.trimStart().startsWith("#version") ? fragment : HEADER + fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  emptyVao ??= new WeakMap();
  if (!emptyVao.has(gl)) emptyVao.set(gl, gl.createVertexArray()!);
  const locations = new Map<string, WebGLUniformLocation | null>();
  const pass: Pass = {
    program,
    uniform(name) {
      if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
      return locations.get(name)!;
    },
    draw(target, setUniforms) {
      gl.useProgram(program);
      gl.bindVertexArray(emptyVao!.get(gl)!);
      if (target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, target.width, target.height);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }
      setUniforms?.(pass);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program);
    },
  };
  return pass;
}

/** Binds a texture to a texture unit and points a sampler uniform at it. */
export function bindTexture(gl: WebGL2RenderingContext, pass: Pass, name: string, texture: WebGLTexture, unit: number) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(pass.uniform(name), unit);
}
