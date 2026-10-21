import * as T from "../vendor/three.module.js";
const cache = new Map();
let webgl;
export const poster = (kind = 0, phase = 5, view = 0) =>
  `./assets/renders/${kind}-${phase}-${((view % 24) + 24) % 24}.webp`;
const eased = (x) => x * x * (3 - 2 * x);
export function supported() {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    webgl = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}
async function load(k) {
  if (cache.has(k)) return cache.get(k);
  const job = (async () => {
    const [m, b] = await Promise.all([
      fetch(`./assets/models/${k}.json`).then((r) => r.json()),
      fetch(`./assets/models/${k}.bin`).then((r) => r.arrayBuffer()),
    ]);
    const g = new T.BufferGeometry();
    for (const n of ["position", "normal", "color"]) {
      const a = m.parts[n];
      const arr = new Float32Array(b, a.offset, a.length);
      if (n === "color")
        for (let i = 0; i < arr.length; i++)
          arr[i] =
            arr[i] <= 0.04045
              ? arr[i] / 12.92
              : Math.pow((arr[i] + 0.055) / 1.055, 2.4);
      g.setAttribute(n, new T.BufferAttribute(arr, 3));
    }
    const idx = m.parts.index;
    g.setIndex(
      new T.BufferAttribute(new Uint32Array(b, idx.offset, idx.length), 1),
    );
    g.computeBoundingSphere();
    return g;
  })();
  cache.set(k, job);
  return job;
}
function bumpTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const cx = c.getContext("2d"),
    im = cx.createImageData(256, 256);
  let s = 6721;
  for (let i = 0; i < im.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    let v = 70 + (s % 150);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
    im.data[i + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  const tex = new T.CanvasTexture(c);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}
export function mountSculpture(
  el,
  { kind = 0, phase = 5, interactive = true, onMode = () => {} } = {},
) {
  let active = true,
    obj,
    renderer,
    frame,
    angle = -0.43,
    tilt = 0,
    zoom = 1,
    stage = phase,
    targetPhase = phase,
    raf,
    autospin = false,
    lastTouch = 0;
  let targetAngle = angle,
    lastTick = performance.now();
  el.innerHTML = `<img class="model-poster" alt="手工彩绘泥塑三维预览" src="${poster(kind, Math.round(phase))}" draggable="false">`;
  const img = el.firstElementChild;
  const touches = new Map();
  let prevX,
    prevY,
    dragging = false,
    pinchDistance = 0;
  let fallbackIndex = 0,
    mode = "preview",
    scene,
    camera,
    uniforms = { uPhase: { value: phase } };
  let ro;
  function updateFallback() {
    const i =
      ((Math.round(((angle + 0.43) / (Math.PI * 2)) * 24) % 24) + 24) % 24;
    const p = Math.round(stage),
      f = Math.round(stage * 24);
    const url =
      i === 0 && f % 24 !== 0
        ? `./assets/renders/${kind}-motion-${f}.webp`
        : poster(kind, p, i);
    if (img.dataset.frame !== url) {
      img.src = url;
      img.dataset.frame = url;
    }
    img.style.transform = `scale(${zoom})`;
  }
  function down(e) {
    if (!interactive) return;
    el.setPointerCapture?.(e.pointerId);
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    if (touches.size === 2) {
      const a = [...touches.values()];
      pinchDistance = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
    }
  }
  function move(e) {
    if (!interactive || !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const a = [...touches.values()],
        d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
      zoom = Math.min(1.5, Math.max(0.72, (zoom * d) / (pinchDistance || d)));
      pinchDistance = d;
    } else {
      targetAngle += (e.clientX - prevX) * 0.009;
      tilt = Math.min(
        0.22,
        Math.max(-0.18, tilt + (e.clientY - prevY) * 0.003),
      );
      prevX = e.clientX;
      prevY = e.clientY;
    }
    e.preventDefault();
  }
  function up(e) {
    touches.delete(e.pointerId);
    dragging = touches.size > 0;
  }
  function wheel(e) {
    if (!interactive) return;
    e.preventDefault();
    zoom = Math.min(1.5, Math.max(0.72, zoom - e.deltaY * 0.001));
  }
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("wheel", wheel, { passive: false });
  function tick() {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    const now = performance.now(),
      dt = Math.min(0.15, (now - lastTick) / 1000);
    lastTick = now;
    const damping = 1 - Math.exp(-dt / 0.08);
    stage += (targetPhase - stage) * damping;
    if (Math.abs(stage - targetPhase) < 0.002) stage = targetPhase;
    if (autospin && !dragging) targetAngle += 0.003;
    angle += (targetAngle - angle) * damping;
    if (obj) {
      obj.rotation.set(tilt, angle, 0);
      obj.scale.setScalar(zoom);
      uniforms.uPhase.value = stage;
      renderer.render(scene, camera);
    } else updateFallback();
  }
  tick();
  if (supported())
    (async () => {
      try {
        const geom = await load(kind);
        if (!active) return;
        renderer = new T.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = T.PCFSoftShadowMap;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputColorSpace = T.SRGBColorSpace;
        scene = new T.Scene();
        camera = new T.OrthographicCamera(-1.8, 1.8, 2.025, -2.025, 0.1, 40);
        camera.position.set(0, 2.65, 7.5);
        camera.lookAt(0, 1.28, 0);
        scene.add(new T.HemisphereLight("#fff5e2", "#aa916b", 2.1));
        const key = new T.DirectionalLight("#fff1d8", 3.2);
        key.position.set(-4, 7, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -3;
        key.shadow.camera.right = 3;
        key.shadow.camera.top = 4;
        key.shadow.camera.bottom = -2;
        key.shadow.normalBias = 0.018;
        key.shadow.bias = -0.0001;
        scene.add(key);
        const fill = new T.DirectionalLight("#f4e9d8", 1);
        fill.position.set(4, 2, 3);
        scene.add(fill);
        const rim = new T.DirectionalLight("#fff6e9", 0.9);
        rim.position.set(2, 4, -4);
        scene.add(rim);
        const mat = new T.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.95,
          metalness: 0,
        });
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uPhase = uniforms.uPhase;
          shader.vertexShader =
            "uniform float uPhase; varying vec3 vClayPosition;\n" +
            shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
vec3 clayUnit=normalize(position-vec3(0.,1.2,0.));float clayMorph=1.-smoothstep(0.,1.8,uPhase);vec3 lump=clayUnit*vec3(.78,.56,.67)+vec3(0.,.56,0.);transformed=mix(position,lump,clayMorph);vClayPosition=position;`,
          );
          shader.vertexShader = shader.vertexShader.replace(
            "#include <beginnormal_vertex>",
            `#include <beginnormal_vertex>
objectNormal=normalize(mix(objectNormal,normalize(position-vec3(0.,1.2,0.)),1.-smoothstep(0.,1.8,uPhase)));`,
          );
          shader.fragmentShader =
            `uniform float uPhase;varying vec3 vClayPosition;
float clayHash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float clayNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(clayHash(i),clayHash(i+vec3(1,0,0)),f.x),mix(clayHash(i+vec3(0,1,0)),clayHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(clayHash(i+vec3(0,0,1)),clayHash(i+vec3(1,0,1)),f.x),mix(clayHash(i+vec3(0,1,1)),clayHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
` + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            `#include <color_fragment>
vec3 clayBase=mix(vec3(.345,.140,.058),vec3(.477,.243,.099),smoothstep(2.,3.,uPhase));clayBase=mix(clayBase,vec3(.730,.604,.367),smoothstep(3.,4.,uPhase));float reveal=smoothstep(vClayPosition.y/3.2-.15,vClayPosition.y/3.2+.15,(uPhase-4.)*1.3);diffuseColor.rgb=mix(clayBase,diffuseColor.rgb,reveal);diffuseColor.rgb*=.94+clayNoise(vClayPosition*130.)*.10;`,
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <normal_fragment_maps>",
            `#include <normal_fragment_maps>
float grain=clayNoise(vClayPosition*130.);vec3 perturb=vec3(clayNoise(vClayPosition*145.+vec3(5,0,0))-.5,clayNoise(vClayPosition*145.+vec3(0,5,0))-.5,clayNoise(vClayPosition*145.+vec3(0,0,5))-.5);normal=normalize(normal+perturb*.11);`,
          );
        };
        obj = new T.Mesh(geom, mat);
        obj.customDepthMaterial = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking,
        });
        obj.customDepthMaterial.onBeforeCompile = (shader) => {
          shader.uniforms.uPhase = uniforms.uPhase;
          shader.vertexShader = "uniform float uPhase;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvec3 unit=normalize(position-vec3(0.,1.2,0.));transformed=mix(position,unit*vec3(.78,.56,.67)+vec3(0.,.56,0.),1.-smoothstep(0.,1.8,uPhase));",
          );
        };
        obj.castShadow = true;
        obj.receiveShadow = true;
        scene.add(obj);
        const ground = new T.Mesh(
          new T.PlaneGeometry(100, 100),
          new T.ShadowMaterial({ opacity: 0.13 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.015;
        ground.receiveShadow = true;
        scene.add(ground);
        renderer.domElement.className = "real-model";
        renderer.domElement.setAttribute(
          "aria-label",
          "可旋转缩放的真实三维泥塑",
        );
        el.appendChild(renderer.domElement);
        ro = new ResizeObserver(() => {
          const w = el.clientWidth,
            h = el.clientHeight;
          renderer.setSize(w, h);
          const ratio = w / h;
          camera.left = -2.025 * ratio;
          camera.right = 2.025 * ratio;
          camera.top = 2.025;
          camera.bottom = -2.025;
          camera.updateProjectionMatrix();
        });
        ro.observe(el);
        mode = "webgl";
        img.style.opacity = "0";
        onMode("webgl");
      } catch (e) {
        console.warn("3D兼容预览", e);
        onMode("turntable");
      }
    })();
  else onMode("turntable");
  return {
    setPhase(p) {
      targetPhase = Math.min(5, Math.max(0, p));
    },
    setKind: async (k, p = targetPhase) => {
      kind = k;
      stage = targetPhase = p;
      img.src = poster(k, Math.round(p));
      if (obj) {
        const geom = await load(k);
        if (active) obj.geometry = geom;
      } else updateFallback();
    },
    rotate() {
      autospin = !autospin;
      return autospin;
    },
    reset() {
      targetAngle = -0.43;
      tilt = 0;
      zoom = 1;
      autospin = false;
    },
    zoom(d) {
      zoom = Math.max(0.72, Math.min(1.5, zoom + d));
    },
    destroy() {
      active = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      renderer?.dispose();
      if (obj) obj.material.dispose();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    },
    getMode: () => mode,
  };
}
