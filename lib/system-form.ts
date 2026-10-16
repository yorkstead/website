export const systemFormSequence = [
  "core",
  "architecture",
  "core",
  "flow",
  "core",
  "network",
  "core",
  "disorder",
  "core",
  "structure",
  "core",
  "core",
] as const;

export type SystemFormName = (typeof systemFormSequence)[number];
export type Point3 = readonly [number, number, number];

export type SystemFormParticle = {
  position: Point3;
  tangent: Point3;
  spread: Point3;
  phase: number;
  length: number;
};

export type SystemFormTargets = Record<SystemFormName, SystemFormParticle[]>;

export const typescriptFragments = [
  'type State =\n  | "idle"\n  | "active";',
  "interface Workflow {\n  state: State;\n}",
  "const plan =\n  await map(job);",
  "for (const step of plan) {\n  await step.execute();\n}",
  'return {\n  status: "ready"\n};',
  "export async function\nrun(job: Job) {",
  "const queue: Step[] =\n  workflow.steps;",
  "await Promise.all(\n  queue.map(execute)\n);",
] as const;

export type TypeScriptFragmentTarget = {
  position: Point3;
  spread: Point3;
};

export type TypeScriptFragmentTargets = Record<SystemFormName, TypeScriptFragmentTarget[]>;

export const systemFormSubjects = {
  architecture: "shop-drawing",
  disorder: "clipboard",
  flow: "shopfloor-layout",
  structure: "assembly-drawing",
  network: "pos-terminal",
} as const;

type LineSegment = readonly [Point3, Point3];

const shopDrawingLines: readonly LineSegment[] = [
  [[-0.78, -0.7, 0], [0.78, -0.7, 0]],
  [[0.78, -0.7, 0], [0.78, 0.7, 0]],
  [[0.78, 0.7, 0], [-0.78, 0.7, 0]],
  [[-0.78, 0.7, 0], [-0.78, -0.7, 0]],
  [[-0.48, -0.38, 0.04], [0.48, -0.38, 0.04]],
  [[0.48, -0.38, 0.04], [0.48, 0.38, 0.04]],
  [[0.48, 0.38, 0.04], [-0.48, 0.38, 0.04]],
  [[-0.48, 0.38, 0.04], [-0.48, -0.38, 0.04]],
  [[-0.6, -0.5, -0.02], [0.6, -0.5, -0.02]],
  [[-0.6, -0.56, -0.02], [-0.6, -0.44, -0.02]],
  [[0.6, -0.56, -0.02], [0.6, -0.44, -0.02]],
  [[-0.6, 0.5, -0.02], [0.6, 0.5, -0.02]],
  [[-0.6, 0.44, -0.02], [-0.6, 0.56, -0.02]],
  [[0.6, 0.44, -0.02], [0.6, 0.56, -0.02]],
  [[-0.7, -0.62, 0], [-0.52, -0.62, 0]],
  [[0.52, 0.62, 0], [0.7, 0.62, 0]],
];

const clipboardLines: readonly LineSegment[] = [
  [[-0.56, -0.72, 0], [0.56, -0.72, 0]],
  [[0.56, -0.72, 0], [0.56, 0.58, 0]],
  [[0.56, 0.58, 0], [-0.56, 0.58, 0]],
  [[-0.56, 0.58, 0], [-0.56, -0.72, 0]],
  [[-0.2, 0.58, 0.04], [-0.2, 0.74, 0.04]],
  [[-0.2, 0.74, 0.04], [0.2, 0.74, 0.04]],
  [[0.2, 0.74, 0.04], [0.2, 0.58, 0.04]],
  [[-0.4, 0.34, 0.02], [-0.28, 0.22, 0.02]],
  [[-0.28, 0.22, 0.02], [-0.12, 0.42, 0.02]],
  [[-0.02, 0.32, 0.02], [0.4, 0.32, 0.02]],
  [[-0.4, -0.04, 0.02], [-0.28, -0.16, 0.02]],
  [[-0.28, -0.16, 0.02], [-0.12, 0.04, 0.02]],
  [[-0.02, -0.06, 0.02], [0.4, -0.06, 0.02]],
  [[-0.4, -0.42, 0.02], [-0.28, -0.54, 0.02]],
  [[-0.28, -0.54, 0.02], [-0.12, -0.34, 0.02]],
  [[-0.02, -0.44, 0.02], [0.4, -0.44, 0.02]],
];

const shopfloorLayoutLines: readonly LineSegment[] = [
  [[-0.82, -0.66, 0], [0.82, -0.66, 0]],
  [[0.82, -0.66, 0], [0.82, 0.66, 0]],
  [[0.82, 0.66, 0], [-0.82, 0.66, 0]],
  [[-0.82, 0.66, 0], [-0.82, -0.66, 0]],
  [[-0.64, 0.38, 0.03], [-0.18, 0.38, 0.03]],
  [[-0.18, 0.38, 0.03], [-0.18, 0.08, 0.03]],
  [[-0.18, 0.08, 0.03], [-0.64, 0.08, 0.03]],
  [[-0.64, 0.08, 0.03], [-0.64, 0.38, 0.03]],
  [[0.2, 0.48, 0.03], [0.62, 0.48, 0.03]],
  [[0.62, 0.48, 0.03], [0.62, 0.16, 0.03]],
  [[0.62, 0.16, 0.03], [0.2, 0.16, 0.03]],
  [[0.2, 0.16, 0.03], [0.2, 0.48, 0.03]],
  [[-0.62, -0.18, 0.03], [-0.18, -0.18, 0.03]],
  [[-0.18, -0.18, 0.03], [-0.18, -0.5, 0.03]],
  [[-0.18, -0.5, 0.03], [-0.62, -0.5, 0.03]],
  [[-0.62, -0.5, 0.03], [-0.62, -0.18, 0.03]],
  [[0.2, -0.12, 0.03], [0.62, -0.12, 0.03]],
  [[0.62, -0.12, 0.03], [0.62, -0.48, 0.03]],
  [[0.62, -0.48, 0.03], [0.2, -0.48, 0.03]],
  [[0.2, -0.48, 0.03], [0.2, -0.12, 0.03]],
  [[0, -0.58, -0.02], [0, 0.58, -0.02]],
];

const assemblyDrawingLines: readonly LineSegment[] = [
  [[-0.28, 0.68, 0.04], [0.28, 0.68, 0.04]],
  [[0.28, 0.68, 0.04], [0.28, 0.48, 0.04]],
  [[0.28, 0.48, 0.04], [-0.28, 0.48, 0.04]],
  [[-0.28, 0.48, 0.04], [-0.28, 0.68, 0.04]],
  [[-0.5, 0.24, 0.02], [0.5, 0.24, 0.02]],
  [[0.5, 0.24, 0.02], [0.5, -0.02, 0.02]],
  [[0.5, -0.02, 0.02], [-0.5, -0.02, 0.02]],
  [[-0.5, -0.02, 0.02], [-0.5, 0.24, 0.02]],
  [[-0.38, -0.28, 0], [0.38, -0.28, 0]],
  [[0.38, -0.28, 0], [0.38, -0.48, 0]],
  [[0.38, -0.48, 0], [-0.38, -0.48, 0]],
  [[-0.38, -0.48, 0], [-0.38, -0.28, 0]],
  [[-0.62, -0.64, -0.02], [0.62, -0.64, -0.02]],
  [[0, 0.82, -0.04], [0, 0.38, -0.04]],
  [[0, 0.34, -0.04], [0, -0.14, -0.04]],
  [[0, -0.18, -0.04], [0, -0.56, -0.04]],
  [[-0.7, 0.12, -0.02], [-0.56, 0.12, -0.02]],
  [[0.56, -0.38, -0.02], [0.7, -0.38, -0.02]],
];

const posTerminalLines: readonly LineSegment[] = [
  [[-0.68, 0.62, 0.03], [0.58, 0.62, 0.03]],
  [[0.58, 0.62, 0.03], [0.68, -0.12, 0.03]],
  [[0.68, -0.12, 0.03], [-0.58, -0.12, 0.03]],
  [[-0.58, -0.12, 0.03], [-0.68, 0.62, 0.03]],
  [[-0.48, 0.46, 0.05], [0.4, 0.46, 0.05]],
  [[0.4, 0.46, 0.05], [0.46, 0.04, 0.05]],
  [[0.46, 0.04, 0.05], [-0.42, 0.04, 0.05]],
  [[-0.42, 0.04, 0.05], [-0.48, 0.46, 0.05]],
  [[-0.16, -0.12, 0], [-0.1, -0.42, 0]],
  [[0.18, -0.12, 0], [0.12, -0.42, 0]],
  [[-0.38, -0.42, 0], [0.42, -0.42, 0]],
  [[0.42, -0.42, 0], [0.54, -0.62, 0]],
  [[0.54, -0.62, 0], [-0.5, -0.62, 0]],
  [[-0.5, -0.62, 0], [-0.38, -0.42, 0]],
  [[0.72, 0.38, -0.02], [0.82, 0.38, -0.02]],
  [[0.82, 0.38, -0.02], [0.82, -0.28, -0.02]],
  [[0.82, -0.28, -0.02], [0.72, -0.28, -0.02]],
];

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize([x, y, z]: Point3): Point3 {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function lerpPoint(a: Point3, b: Point3, amount: number): Point3 {
  return [
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ];
}

type FormPoint = { position: Point3; tangent: Point3; length: number };

function corePoint(index: number, count: number): FormPoint {
  const tokensPerRow = count >= 70 ? 7 : 5;
  const rows = Math.ceil(count / tokensPerRow);
  const row = Math.floor(index / tokensPerRow);
  const token = index % tokensPerRow;
  const indent = ((row * 3) % 4) * 0.055;
  const x = -0.7 + indent + token * (1.38 / Math.max(1, tokensPerRow - 1));
  const y = rows <= 1 ? 0 : 0.68 - row * (1.36 / (rows - 1));
  const z = ((row + token * 2) % 3 - 1) * 0.045;
  return {
    position: [x, y, z],
    tangent: normalize([1, 0, token % 3 === 0 ? 0.08 : 0]),
    length: 0.55 + ((row * 5 + token * 3) % 7) * 0.12,
  };
}

function lineDrawingPoint(index: number, count: number, lines: readonly LineSegment[]): FormPoint {
  const edgeProgress = (index / count) * lines.length;
  const edgeIndex = Math.min(lines.length - 1, Math.floor(edgeProgress));
  const [start, end] = lines[edgeIndex];
  const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  const instancesPerSegment = Math.max(1, count / lines.length);
  return {
    position: lerpPoint(start, end, edgeProgress - edgeIndex),
    tangent: normalize([end[0] - start[0], end[1] - start[1], end[2] - start[2]]),
    length: Math.max(0.45, Math.min(2.15, (segmentLength / instancesPerSegment / 0.14) * 0.82)),
  };
}

function architecturePoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, shopDrawingLines);
}

function disorderPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, clipboardLines);
}

function flowPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, shopfloorLayoutLines);
}

function structurePoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, assemblyDrawingLines);
}

function networkPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, posTerminalLines);
}

export function generateSystemFormTargets(count: number): SystemFormTargets {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("SystemForm particle count must be a positive integer.");

  const random = seededRandom(0x79726b73 + count);
  const targets: SystemFormTargets = {
    core: [],
    architecture: [],
    disorder: [],
    flow: [],
    structure: [],
    network: [],
  };

  for (let index = 0; index < count; index += 1) {
    const shared = {
      phase: random() * Math.PI * 2,
      spread: normalize([random() - 0.5, random() - 0.5, random() - 0.5]),
    };
    const forms = {
      core: corePoint(index, count),
      architecture: architecturePoint(index, count),
      disorder: disorderPoint(index, count),
      flow: flowPoint(index, count),
      structure: structurePoint(index, count),
      network: networkPoint(index, count),
    };

    for (const name of Object.keys(forms) as (keyof typeof forms)[]) {
      targets[name].push({ ...forms[name], ...shared });
    }
  }

  return targets;
}

export function generateTypeScriptFragmentTargets(): TypeScriptFragmentTargets {
  const count = typescriptFragments.length;
  const random = seededRandom(0x74797065);
  const targets: TypeScriptFragmentTargets = {
    core: [],
    architecture: [],
    disorder: [],
    flow: [],
    structure: [],
    network: [],
  };

  for (let index = 0; index < count; index += 1) {
    const progress = index / Math.max(1, count - 1);
    const angle = progress * Math.PI * 2 - Math.PI / 2;
    const column = index % 2;
    const row = Math.floor(index / 2);
    const shared = {
      spread: normalize([random() - 0.5, random() - 0.5, (random() - 0.5) * 0.3]),
    };

    targets.core.push({
      position: [-0.18 + (index % 3) * 0.055, 0.72 - progress * 1.44, ((index % 3) - 1) * 0.025],
      ...shared,
    });
    targets.architecture.push({
      position: [column === 0 ? -0.5 : 0.5, 0.57 - row * 0.38, column === 0 ? 0.025 : -0.025],
      ...shared,
    });
    targets.disorder.push({
      position: [(random() - 0.5) * 1.65, (random() - 0.5) * 1.4, (random() - 0.5) * 0.12],
      ...shared,
    });
    targets.flow.push({
      position: [-0.78 + progress * 1.56, Math.sin(progress * Math.PI * 2.25) * 0.55, ((index % 3) - 1) * 0.025],
      ...shared,
    });
    targets.structure.push({
      position: [column === 0 ? -0.48 : 0.48, 0.57 - row * 0.38, 0],
      ...shared,
    });
    targets.network.push({
      position: [Math.cos(angle) * 0.72, Math.sin(angle) * 0.63, Math.sin(angle * 2) * 0.04],
      ...shared,
    });
  }

  return targets;
}
