"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  generateSystemFormTargets,
  generateTypeScriptFragmentTargets,
  systemFormSequence,
  typescriptFragments,
} from "@/lib/system-form";

type MotionState = {
  fromIndex: number;
  toIndex: number;
  progress: number;
  velocity: number;
};

const desktopParticleCount = 84;
const mobileParticleCount = 42;
const maximumSpread = 0.42;
const desktopPlacements = [
  [84, 34],
  [82, 68],
  [64, 76],
  [18, 62],
  [18, 28],
  [74, 22],
  [84, 62],
] as const;
const mobilePlacements = [
  [78, 28],
  [80, 68],
  [72, 74],
  [28, 68],
  [24, 26],
  [76, 22],
  [78, 64],
] as const;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setMatches(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function useDocumentVisibility() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return visible;
}

function useSystemColor() {
  const [color, setColor] = useState("#2d7fac");

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setColor(root.classList.contains("dark") ? "#6bb9df" : "#2d7fac");
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return color;
}

function SystemFormFallback() {
  return (
    <div className="system-form-fallback" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <i />
    </div>
  );
}

function createCodeTexture(fragment: string, color: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;

  const lines = fragment.split("\n");
  const font = '500 28px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
  context.font = font;
  const width = Math.max(...lines.map((line) => context.measureText(line).width));
  canvas.width = Math.ceil(width + 24);
  canvas.height = lines.length * 34 + 18;
  context.font = font;
  context.globalAlpha = 0.9;
  context.textBaseline = "middle";
  const dark = color === "#6bb9df";
  const palette = {
    base: color,
    keyword: dark ? "#bcb2ff" : "#725fd0",
    string: dark ? "#7ed8ba" : "#187f69",
    type: dark ? "#e3c37d" : "#956715",
  };
  const tokenPattern = /("[^"]*"|\b(?:type|interface|const|await|async|function|export|for|of|return)\b|\b(?:Workflow|State|Step|Job|Promise)\b)/g;

  lines.forEach((line, index) => {
    let cursor = 0;
    let x = 12;
    const y = 10 + index * 34 + 17;

    for (const match of line.matchAll(tokenPattern)) {
      const matchIndex = match.index ?? 0;
      const before = line.slice(cursor, matchIndex);
      context.fillStyle = palette.base;
      context.fillText(before, x, y);
      x += context.measureText(before).width;

      const token = match[0];
      context.fillStyle = token.startsWith('"')
        ? palette.string
        : /^(Workflow|State|Step|Job|Promise)$/.test(token)
          ? palette.type
          : palette.keyword;
      context.fillText(token, x, y);
      x += context.measureText(token).width;
      cursor = matchIndex + token.length;
    }

    context.fillStyle = palette.base;
    context.fillText(line.slice(cursor), x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, aspect: canvas.width / canvas.height, lines: lines.length };
}

function TypeScriptFragments({ color, motion }: { color: string; motion: MutableRefObject<MotionState> }) {
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const renderedPositions = useRef(new Float32Array(typescriptFragments.length * 3));
  const hasSettledFrame = useRef(false);
  const renderedVelocity = useRef(0);
  const targets = useMemo(() => generateTypeScriptFragmentTargets(), []);
  const textures = useMemo(
    () => typescriptFragments.map((fragment) => createCodeTexture(fragment, color)),
    [color],
  );
  const position = useMemo(() => new THREE.Vector3(), []);
  const spread = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const currentTextures = textures;
    return () => currentTextures.forEach((entry) => entry?.texture.dispose());
  }, [textures]);

  useFrame(({ clock }, delta) => {
    const state = motion.current;
    const fromName = systemFormSequence[state.fromIndex];
    const toName = systemFormSequence[state.toIndex];
    const progress = THREE.MathUtils.clamp(state.progress, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const transitionArc = Math.sin(progress * Math.PI);
    const damping = hasSettledFrame.current ? 1 - Math.exp(-delta * 5.5) : 1;
    renderedVelocity.current = Math.max(state.velocity, renderedVelocity.current * Math.pow(0.025, delta));
    const velocityContribution = Math.min(1, renderedVelocity.current / 2200);
    const elapsed = clock.getElapsedTime();

    for (let index = 0; index < typescriptFragments.length; index += 1) {
      const sprite = sprites.current[index];
      if (!sprite) continue;
      const source = targets[fromName][index];
      const destination = targets[toName][index];
      position.set(
        THREE.MathUtils.lerp(source.position[0], destination.position[0], eased),
        THREE.MathUtils.lerp(source.position[1], destination.position[1], eased),
        THREE.MathUtils.lerp(source.position[2], destination.position[2], eased),
      );
      spread.set(source.spread[0], source.spread[1], source.spread[2]);
      position.addScaledVector(spread, transitionArc * (0.15 + velocityContribution * 0.3));
      const compilePulse = (Math.sin(elapsed * 1.15 - index * 0.78) + 1) * 0.5;
      position.set(
        position.x + Math.sin(elapsed * 0.5 + index * 0.9) * 0.014,
        position.y + Math.sin(elapsed * 0.68 + index * 1.3) * 0.018,
        position.z,
      );

      const offset = index * 3;
      renderedPositions.current[offset] = THREE.MathUtils.lerp(renderedPositions.current[offset], position.x, damping);
      renderedPositions.current[offset + 1] = THREE.MathUtils.lerp(renderedPositions.current[offset + 1], position.y, damping);
      renderedPositions.current[offset + 2] = THREE.MathUtils.lerp(renderedPositions.current[offset + 2], position.z, damping);
      sprite.position.set(
        renderedPositions.current[offset],
        renderedPositions.current[offset + 1],
        renderedPositions.current[offset + 2],
      );
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = 0.48 + compilePulse * 0.14 + transitionArc * 0.06;
    }

    hasSettledFrame.current = true;
  });

  return (
    <group>
      {textures.map((entry, index) => {
        if (!entry) return null;
        const height = entry.lines * 0.082;
        return (
          <sprite
            key={typescriptFragments[index]}
            ref={(sprite) => {
              sprites.current[index] = sprite;
            }}
            scale={[height * entry.aspect, height, 1]}
          >
            <spriteMaterial map={entry.texture} transparent opacity={0.52} depthWrite={false} depthTest={false} />
          </sprite>
        );
      })}
    </group>
  );
}

function SystemParticles({
  color,
  count,
  motion,
}: {
  color: string;
  count: number;
  motion: MutableRefObject<MotionState>;
}) {
  const group = useRef<THREE.Group>(null);
  const rods = useRef<THREE.InstancedMesh>(null);
  const points = useRef<THREE.BufferGeometry>(null);
  const renderedVelocity = useRef(0);
  const settledPositions = useRef(new Float32Array(count * 3));
  const settledTangents = useRef(new Float32Array(count * 3));
  const settledLengths = useRef(new Float32Array(count));
  const hasSettledFrame = useRef(false);
  const targets = useMemo(() => generateSystemFormTargets(count), [count]);
  const initialPointPositions = useMemo(() => new Float32Array(count * 3), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const spread = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    rods.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    settledPositions.current = new Float32Array(count * 3);
    settledTangents.current = new Float32Array(count * 3);
    settledLengths.current = new Float32Array(count);
    hasSettledFrame.current = false;
  }, [count]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !rods.current || !points.current) return;

    const state = motion.current;
    const fromName = systemFormSequence[state.fromIndex];
    const toName = systemFormSequence[state.toIndex];
    const from = targets[fromName];
    const to = targets[toName];
    const progress = Math.max(0, Math.min(1, state.progress));
    const eased = progress * progress * (3 - 2 * progress);
    const transitionArc = Math.sin(progress * Math.PI);
    renderedVelocity.current = Math.max(state.velocity, renderedVelocity.current * Math.pow(0.025, delta));
    const velocityContribution = Math.min(1, renderedVelocity.current / 2200);
    const spreadAmount = Math.min(maximumSpread, transitionArc * (0.16 + velocityContribution * 0.32));
    const positionAttribute = points.current.getAttribute("position") as THREE.BufferAttribute;
    const damping = hasSettledFrame.current ? 1 - Math.exp(-delta * 5.5) : 1;
    const renderedPositions = settledPositions.current;
    const renderedTangents = settledTangents.current;
    const renderedLengths = settledLengths.current;

    const elapsed = clock.getElapsedTime();

    for (let index = 0; index < count; index += 1) {
      const source = from[index];
      const destination = to[index];
      position.set(
        THREE.MathUtils.lerp(source.position[0], destination.position[0], eased),
        THREE.MathUtils.lerp(source.position[1], destination.position[1], eased),
        THREE.MathUtils.lerp(source.position[2], destination.position[2], eased),
      );
      spread.set(source.spread[0], source.spread[1], source.spread[2]);
      position.addScaledVector(spread, spreadAmount);
      position.set(position.x, position.y, position.z + Math.sin(elapsed * 0.72 + source.phase) * 0.018);

      const offset = index * 3;
      renderedPositions[offset] = THREE.MathUtils.lerp(renderedPositions[offset], position.x, damping);
      renderedPositions[offset + 1] = THREE.MathUtils.lerp(renderedPositions[offset + 1], position.y, damping);
      renderedPositions[offset + 2] = THREE.MathUtils.lerp(renderedPositions[offset + 2], position.z, damping);
      position.set(renderedPositions[offset], renderedPositions[offset + 1], renderedPositions[offset + 2]);
      positionAttribute.setXYZ(index, position.x, position.y, position.z);

      tangent
        .set(
          THREE.MathUtils.lerp(source.tangent[0], destination.tangent[0], eased),
          THREE.MathUtils.lerp(source.tangent[1], destination.tangent[1], eased),
          THREE.MathUtils.lerp(source.tangent[2], destination.tangent[2], eased),
        )
        .normalize();
      renderedTangents[offset] = THREE.MathUtils.lerp(renderedTangents[offset], tangent.x, damping);
      renderedTangents[offset + 1] = THREE.MathUtils.lerp(renderedTangents[offset + 1], tangent.y, damping);
      renderedTangents[offset + 2] = THREE.MathUtils.lerp(renderedTangents[offset + 2], tangent.z, damping);
      tangent.set(renderedTangents[offset], renderedTangents[offset + 1], renderedTangents[offset + 2]).normalize();
      const idleSignal = 1 + Math.sin(elapsed * 1.05 - index * 0.22) * 0.065;
      const targetLength = THREE.MathUtils.lerp(source.length, destination.length, eased) * idleSignal;
      renderedLengths[index] = THREE.MathUtils.lerp(renderedLengths[index], targetLength, damping);
      dummy.position.copy(position);
      dummy.quaternion.setFromUnitVectors(up, tangent);
      dummy.scale.set(1, renderedLengths[index], 1);
      dummy.updateMatrix();
      rods.current.setMatrixAt(index, dummy.matrix);
    }

    rods.current.instanceMatrix.needsUpdate = true;
    positionAttribute.needsUpdate = true;
    hasSettledFrame.current = true;

    const breath = 1 + Math.sin(elapsed * 0.82) * 0.028;
    group.current.scale.setScalar(breath);
    group.current.rotation.x = Math.sin(elapsed * 0.38) * 0.035;
    group.current.rotation.y = elapsed * 0.07 + Math.sin(elapsed * 0.31 + 0.8) * 0.045;
    group.current.rotation.z = Math.sin(elapsed * 0.46 + 1.2) * 0.014;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={rods} args={[undefined, undefined, count]} frustumCulled={false}>
        <boxGeometry args={[0.015, 0.14, 0.012]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} depthTest={false} />
      </instancedMesh>
      <points frustumCulled={false}>
        <bufferGeometry ref={points}>
          <bufferAttribute attach="attributes-position" args={[initialPointPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.014} sizeAttenuation transparent opacity={0.3} depthWrite={false} depthTest={false} />
      </points>
      <TypeScriptFragments color={color} motion={motion} />
    </group>
  );
}

export function SystemForm() {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<MotionState>({ fromIndex: 0, toIndex: 0, progress: 0, velocity: 0 });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 700px)");
  const visible = useDocumentVisibility();
  const color = useSystemColor();
  const [webglAvailable, setWebglAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      setWebglAvailable(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (reducedMotion !== false || webglAvailable !== true || mobile === null) return;

    let cancelled = false;
    let animationFrame = 0;
    let lastScrollY = window.scrollY;
    let lastTimestamp = performance.now();
    let killScrollTriggers = () => {};
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-system-form]"));

    const updatePlacement = (fromIndex: number, toIndex: number, progress: number) => {
      if (!root.current) return;
      const placements = mobile ? mobilePlacements : desktopPlacements;
      const from = placements[fromIndex];
      const to = placements[toIndex];
      const eased = progress * progress * (3 - 2 * progress);
      root.current.style.setProperty("--system-form-x", `${THREE.MathUtils.lerp(from[0], to[0], eased)}vw`);
      root.current.style.setProperty("--system-form-y", `${THREE.MathUtils.lerp(from[1], to[1], eased)}vh`);
      const expansion = fromIndex === toIndex ? 1 : 1 + Math.sin(progress * Math.PI) * (mobile ? 0.38 : 0.62);
      root.current.style.setProperty("--system-form-scale", expansion.toFixed(3));
    };

    const updatePresence = (presence: number) => {
      root.current?.style.setProperty("--system-form-presence", THREE.MathUtils.clamp(presence, 0, 1).toFixed(3));
    };

    const synchronizeToSections = () => {
      animationFrame = 0;
      const timestamp = performance.now();
      const elapsed = Math.max(16, timestamp - lastTimestamp);
      const velocity = Math.min(2200, (Math.abs(window.scrollY - lastScrollY) / elapsed) * 1000);
      lastScrollY = window.scrollY;
      lastTimestamp = timestamp;

      const startLine = window.innerHeight;
      const endLine = window.innerHeight * 0.2;
      const transitionDistance = Math.max(1, startLine - endLine);
      let completedTransitions = 0;

      for (let transitionIndex = 0; transitionIndex < sections.length - 1; transitionIndex += 1) {
        const targetTop = sections[transitionIndex + 1].getBoundingClientRect().top;
        const progress = THREE.MathUtils.clamp((startLine - targetTop) / transitionDistance, 0, 1);

        if (progress <= 0) break;
        if (progress >= 1) {
          completedTransitions = transitionIndex + 1;
          continue;
        }

        motion.current = {
          fromIndex: transitionIndex,
          toIndex: transitionIndex + 1,
          progress,
          velocity,
        };
        updatePlacement(transitionIndex, transitionIndex + 1, progress);
        updatePresence(1);
        root.current?.setAttribute("data-active-form", systemFormSequence[transitionIndex + 1]);
        return;
      }

      motion.current = {
        fromIndex: completedTransitions,
        toIndex: completedTransitions,
        progress: 1,
        velocity: 0,
      };
      updatePlacement(completedTransitions, completedTransitions, 1);
      if (completedTransitions === sections.length - 1) {
        const finalBottom = sections[sections.length - 1].getBoundingClientRect().bottom;
        const fadeStart = window.innerHeight * 0.82;
        const fadeEnd = window.innerHeight * 0.3;
        const fadeProgress = THREE.MathUtils.clamp((fadeStart - finalBottom) / Math.max(1, fadeStart - fadeEnd), 0, 1);
        const easedFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
        updatePresence(1 - easedFade);
      } else {
        updatePresence(1);
      }
      root.current?.setAttribute("data-active-form", systemFormSequence[completedTransitions]);
    };

    const scheduleSynchronization = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(synchronizeToSections);
    };

    window.addEventListener("scroll", scheduleSynchronization, { passive: true });
    window.addEventListener("resize", scheduleSynchronization);
    synchronizeToSections();

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollTriggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const triggers = sections.slice(1).map((section) =>
        ScrollTrigger.create({
          trigger: section,
          start: "top 100%",
          end: "top 20%",
          invalidateOnRefresh: true,
          onUpdate: scheduleSynchronization,
          onRefresh: scheduleSynchronization,
        }),
      );

      ScrollTrigger.refresh();
      killScrollTriggers = () => triggers.forEach((trigger) => trigger.kill());
    });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", scheduleSynchronization);
      window.removeEventListener("resize", scheduleSynchronization);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      killScrollTriggers();
    };
  }, [mobile, reducedMotion, webglAvailable]);

  const useFallback = reducedMotion !== false || webglAvailable !== true;

  return (
    <div ref={root} className="system-form" aria-hidden="true">
      {useFallback ? (
        <SystemFormFallback />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 3.25], fov: 32, near: 0.1, far: 20 }}
          dpr={mobile ? [1, 1.25] : [1, 1.5]}
          frameloop={visible ? "always" : "never"}
          gl={{ alpha: true, antialias: mobile === false, powerPreference: "low-power" }}
          resize={{ debounce: { scroll: 0, resize: 100 } }}
        >
          <SystemParticles color={color} count={mobile ? mobileParticleCount : desktopParticleCount} motion={motion} />
        </Canvas>
      )}
    </div>
  );
}
