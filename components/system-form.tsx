"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { generateSystemFormTargets, systemFormSequence } from "@/lib/system-form";

type MotionState = {
  fromIndex: number;
  toIndex: number;
  progress: number;
  velocity: number;
};

const desktopParticleCount = 84;
const mobileParticleCount = 42;
const maximumSpread = 0.28;

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
  const targets = useMemo(() => generateSystemFormTargets(count), [count]);
  const initialPointPositions = useMemo(() => new Float32Array(count * 3), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const spread = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    rods.current?.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }, []);

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
    const spreadAmount = Math.min(maximumSpread, transitionArc * (0.1 + velocityContribution * 0.18));
    const positionAttribute = points.current.getAttribute("position") as THREE.BufferAttribute;

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

      positionAttribute.setXYZ(index, position.x, position.y, position.z);

      tangent
        .set(
          THREE.MathUtils.lerp(source.tangent[0], destination.tangent[0], eased),
          THREE.MathUtils.lerp(source.tangent[1], destination.tangent[1], eased),
          THREE.MathUtils.lerp(source.tangent[2], destination.tangent[2], eased),
        )
        .normalize();
      dummy.position.copy(position);
      dummy.quaternion.setFromUnitVectors(up, tangent);
      dummy.scale.set(1, 0.72 + Math.sin(source.phase) * 0.16, 1);
      dummy.updateMatrix();
      rods.current.setMatrixAt(index, dummy.matrix);
    }

    rods.current.instanceMatrix.needsUpdate = true;
    positionAttribute.needsUpdate = true;

    const elapsed = clock.getElapsedTime();
    const breath = 1 + Math.sin(elapsed * 0.82) * 0.012;
    group.current.scale.setScalar(breath);
    group.current.rotation.x = Math.sin(elapsed * 0.18) * 0.018;
    group.current.rotation.y = Math.sin(elapsed * 0.14 + 0.8) * 0.026;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={rods} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.009, 0.009, 0.13, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.46} depthWrite={false} depthTest={false} />
      </instancedMesh>
      <points frustumCulled={false}>
        <bufferGeometry ref={points}>
          <bufferAttribute attach="attributes-position" args={[initialPointPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.022} sizeAttenuation transparent opacity={0.58} depthWrite={false} depthTest={false} />
      </points>
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
    if (reducedMotion !== false || webglAvailable !== true) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollTriggerModule]) => {
      if (cancelled) return;
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-system-form]"));
      const context = gsap.context(() => {
        sections.slice(1).forEach((section, transitionIndex) => {
          const proxy = { progress: 0 };
          const tween = gsap.fromTo(
            proxy,
            { progress: 0 },
            {
              progress: 1,
              ease: "none",
              immediateRender: false,
              onUpdate: () => {
                if (!tween.scrollTrigger?.isActive) return;
                motion.current.fromIndex = transitionIndex;
                motion.current.toIndex = transitionIndex + 1;
                motion.current.progress = proxy.progress;
              },
              scrollTrigger: {
                trigger: section,
                start: "top 86%",
                end: "top 42%",
                scrub: 0.45,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                  motion.current.velocity = Math.min(2200, Math.abs(self.getVelocity()));
                },
                onLeave: () => {
                  motion.current = { fromIndex: transitionIndex + 1, toIndex: transitionIndex + 1, progress: 1, velocity: 0 };
                },
                onLeaveBack: () => {
                  motion.current = { fromIndex: transitionIndex, toIndex: transitionIndex, progress: 0, velocity: 0 };
                },
              },
            },
          );
        });
      }, root);

      ScrollTrigger.refresh();
      cleanup = () => context.revert();
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reducedMotion, webglAvailable]);

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
