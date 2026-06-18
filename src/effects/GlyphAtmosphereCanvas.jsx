import { useEffect, useRef } from "react";
import "./glyphAtmosphere.css";

const GLYPH_ATMOSPHERE_SEED = "cached-eye-reference:seed-1:night:altered";
const GLYPH_ATMOSPHERE_GLYPHS = [".", "-", "*", "+", "x", "X", ":", "'", "`"];

const UI_PRESENTATION_GLYPH_FORMAT = {
  "day-calm": "day-glow",
  "day-anomaly": "day-glow",
  "day-critical": "critical-corruption",
  "night-calm": "night-blue-glow",
  "night-anomaly": "night-red-rain",
  "night-critical": "critical-corruption",
};

const GLYPH_ATMOSPHERE_LAYERS = [
  { key: "slow", speed: 0.45, alpha: 0.45 },
  { key: "mid", speed: 0.8, alpha: 0.65 },
  { key: "fast", speed: 1.15, alpha: 0.35 },
];

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash01(...parts) {
  const base = hashString(parts.join("|"));
  let h = base + 0x6d2b79f5;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

function pickHashed(list, ...parts) {
  return list[Math.floor(hash01(...parts) * list.length) % list.length];
}

export function getGlyphAtmosphereFormat(preset, isNight) {
  return UI_PRESENTATION_GLYPH_FORMAT[preset] ?? (isNight ? "night-blue-glow" : "day-glow");
}

export function createGlyphAtmosphereEffect(isNight, intensity) {
  return {
    enabled: isNight ? intensity >= 0.12 : true,
    intensity: isNight ? intensity : Math.max(0.22, intensity),
    format: isNight ? "night-red-rain" : "day-glow",
  };
}

export function applyGlyphAtmospherePresentation(effect, presentation, intensity) {
  return {
    ...effect,
    enabled: true,
    format: presentation.glyphFormat,
    intensity: presentation.timePhase === "night"
      ? Math.max(0.2, intensity)
      : Math.max(0.22, intensity),
  };
}

function getGlyphAtmosphereConfig(format) {
  switch (format) {
    case "night-blue-glow":
      return {
        kind: "glow",
        core: [202, 225, 255],
        halo: [116, 164, 255],
        glyph: [164, 198, 255],
        speedScale: 0.62,
        alphaScale: 0.86,
      };
    case "night-red-rain":
      return {
        kind: "glyph",
        glyph: [225, 24, 42],
        speedScale: 1,
        alphaScale: 1,
      };
    case "critical-corruption":
      return {
        kind: "corruption",
        glyph: [255, 35, 54],
        alt: [255, 215, 222],
        speedScale: 1.36,
        alphaScale: 1.28,
      };
    case "day-glow":
    default:
      return {
        kind: "glow",
        core: [255, 255, 236],
        halo: [255, 245, 190],
        glyph: [255, 245, 190],
        speedScale: 0.72,
        alphaScale: 1,
      };
  }
}

function buildGlyphAtmosphereTexture(width, height, format, dpr, layerIndex) {
  const config = getGlyphAtmosphereConfig(format);
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const textureHeight = Math.max(1, safeHeight * 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(safeWidth * dpr));
  canvas.height = Math.max(1, Math.floor(textureHeight * dpr));

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  const baseGlyphCount = Math.round(clampRange((safeWidth * safeHeight) / 4200, 120, 310));
  const glyphCount = Math.max(40, Math.round(baseGlyphCount / GLYPH_ATMOSPHERE_LAYERS.length));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, safeWidth, textureHeight);
  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalCompositeOperation = "source-over";

  for (let index = 0; index < glyphCount; index += 1) {
    const x = hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "x") * safeWidth;
    const y = hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "y") * textureHeight;
    const size = 7 + hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "size") * 8;
    const glyph = pickHashed(
      GLYPH_ATMOSPHERE_GLYPHS,
      GLYPH_ATMOSPHERE_SEED,
      "glyph-layer",
      layerIndex,
      index,
      "glyph",
    );
    const baseAlpha = 0.08 + hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "alpha") * 0.22;
    const glow = 0.45 + hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "light") * 0.55;
    const wave = hash01(GLYPH_ATMOSPHERE_SEED, "glyph-layer", layerIndex, index, "phase");

    ctx.font = `700 ${size}px Consolas, "Courier New", monospace`;

    if (config.kind === "glow") {
      const coreAlpha = Math.min(0.5, baseAlpha * 1.7 * config.alphaScale);
      const haloAlpha = Math.min(0.32, baseAlpha * 1.25 * config.alphaScale);
      ctx.fillStyle = `rgba(${config.core[0]}, ${config.core[1]}, ${config.core[2]}, ${coreAlpha})`;
      ctx.fillRect(x - 1, y - 1, 2 + glow * 2, 2 + glow * 2);
      ctx.fillStyle = `rgba(${config.halo[0]}, ${config.halo[1]}, ${config.halo[2]}, ${haloAlpha * 0.8})`;
      ctx.fillText(glyph, x + glow * 2.2, y + glow * 1.5);
    } else if (config.kind === "corruption") {
      const tear = Math.sin(wave * Math.PI * 2) * glow * 4;
      ctx.fillStyle = `rgba(${config.glyph[0]}, ${config.glyph[1]}, ${config.glyph[2]}, ${Math.min(0.42, baseAlpha * config.alphaScale)})`;
      ctx.fillText(glyph, x + tear, y);
      ctx.fillStyle = `rgba(${config.alt[0]}, ${config.alt[1]}, ${config.alt[2]}, ${Math.min(0.18, baseAlpha * 0.55)})`;
      ctx.fillText(glyph, x - tear * 0.35, y + glow * 3);
    } else {
      ctx.fillStyle = `rgba(${config.glyph[0]}, ${config.glyph[1]}, ${config.glyph[2]}, ${baseAlpha * config.alphaScale})`;
      ctx.fillText(glyph, x, y);
    }
  }

  return {
    canvas,
    textureHeight,
  };
}

export function GlyphAtmosphereCanvas({ effect }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!effect.enabled) return undefined;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionQuery.matches) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let glyphLayers = [];
    let width = 0;
    let height = 0;
    let textureHeight = 0;
    let lastFrameTime = 0;
    const frameInterval = 1000 / 30;
    let frameId = 0;
    let visible = !document.hidden;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(window.innerWidth));
      height = Math.max(1, Math.floor(window.innerHeight));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      glyphLayers = GLYPH_ATMOSPHERE_LAYERS.map((layer, layerIndex) => {
        const cached = buildGlyphAtmosphereTexture(width, height, effect.format, dpr, layerIndex);
        if (!cached) return null;
        return {
          ...layer,
          canvas: cached.canvas,
        };
      }).filter(Boolean);
      textureHeight = glyphLayers[0]?.canvas ? glyphLayers[0].canvas.height / dpr : 0;
    };

    const visibility = () => {
      visible = !document.hidden;
      if (visible) {
        lastFrameTime = 0;
      }
    };

    const draw = (time) => {
      if (!glyphLayers.length) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      if (time - lastFrameTime < frameInterval) {
        frameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = time;

      if (!visible) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      const t = time / 1000;
      const config = getGlyphAtmosphereConfig(effect.format);
      const intensity = clamp01(effect.intensity);
      const scrollBase = 16 + config.speedScale * 18;
      const scrollFactor = 0.6 + intensity * 0.8;
      const baseAlpha = clamp01(0.32 + intensity * (0.2 + config.alphaScale * 0.2));

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glyphLayers.forEach((layer) => {
        const layerShift = (t * scrollBase * layer.speed * scrollFactor * config.speedScale * 1.35) % textureHeight;
        ctx.globalAlpha = baseAlpha * layer.alpha;
        ctx.drawImage(layer.canvas, 0, -layerShift, width, textureHeight);
        ctx.drawImage(layer.canvas, 0, textureHeight - layerShift, width, textureHeight);
      });
      ctx.restore();
      frameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    draw(performance.now());

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [effect.enabled, effect.format]);

  if (!effect.enabled) return null;
  return <canvas className={`glyph-atmosphere-canvas glyph-atmosphere-canvas--${effect.format}`} ref={canvasRef} aria-hidden="true" />;
}
