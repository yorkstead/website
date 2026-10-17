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
  "ownership",
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
  scale: number;
  rotation: number;
};

export type TypeScriptFragmentTargets = Record<SystemFormName, TypeScriptFragmentTarget[]>;

export const systemFormSubjects = {
  architecture: "dimensioned-machine-elevation",
  disorder: "marked-up-shop-traveler",
  flow: "production-routing-plan",
  structure: "exploded-modular-assembly",
  network: "terminal-orthographic-projection",
  ownership: "rotating-system-sphere",
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
  [[-0.64, 0.02, 0.02], [-0.48, 0.02, 0.02]],
  [[-0.48, 0.02, 0.02], [-0.4, 0.12, 0.02]],
  [[-0.4, 0.12, 0.02], [-0.32, 0.02, 0.02]],
  [[-0.32, 0.02, 0.02], [-0.16, 0.02, 0.02]],
  [[-0.08, 0.18, 0.02], [0.44, 0.18, 0.02]],
  [[-0.08, 0.02, 0.02], [0.32, 0.02, 0.02]],
  [[-0.08, -0.14, 0.02], [0.4, -0.14, 0.02]],
  [[-0.08, -0.3, 0.02], [0.24, -0.3, 0.02]],
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
  [[-0.42, 0.48, 0.02], [0.42, 0.48, 0.02]],
  [[-0.42, 0.12, 0.02], [-0.34, 0.04, 0.02]],
  [[-0.34, 0.04, 0.02], [-0.26, 0.12, 0.02]],
  [[-0.42, -0.26, 0.02], [-0.34, -0.34, 0.02]],
  [[-0.34, -0.34, 0.02], [-0.26, -0.26, 0.02]],
  [[-0.12, -0.62, 0.02], [0.34, -0.62, 0.02]],
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
  [[-0.76, 0.56, 0.06], [-0.06, 0.56, 0.06]],
  [[-0.06, 0.56, 0.06], [-0.12, 0.62, 0.06]],
  [[-0.06, 0.56, 0.06], [-0.12, 0.5, 0.06]],
  [[0.06, 0, 0.06], [0.72, 0, 0.06]],
  [[0.72, 0, 0.06], [0.66, 0.06, 0.06]],
  [[0.72, 0, 0.06], [0.66, -0.06, 0.06]],
  [[-0.76, -0.58, 0.06], [-0.06, -0.58, 0.06]],
  [[-0.06, -0.58, 0.06], [-0.12, -0.52, 0.06]],
  [[-0.06, -0.58, 0.06], [-0.12, -0.64, 0.06]],
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
  [[-0.58, 0.34, -0.04], [-0.42, 0.24, -0.04]],
  [[-0.42, 0.24, -0.04], [-0.58, 0.14, -0.04]],
  [[0.58, 0.12, -0.04], [0.42, 0.02, -0.04]],
  [[0.42, 0.02, -0.04], [0.58, -0.08, -0.04]],
  [[-0.46, -0.58, 0.02], [-0.28, -0.72, 0.02]],
  [[0.46, -0.58, 0.02], [0.28, -0.72, 0.02]],
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
  [[-0.32, 0.34, 0.07], [0.3, 0.34, 0.07]],
  [[-0.3, 0.2, 0.07], [0.28, 0.2, 0.07]],
  [[-0.28, 0.08, 0.07], [0.12, 0.08, 0.07]],
  [[-0.26, -0.52, 0.03], [-0.18, -0.52, 0.03]],
  [[-0.04, -0.52, 0.03], [0.04, -0.52, 0.03]],
  [[0.18, -0.52, 0.03], [0.26, -0.52, 0.03]],
  [[0.72, 0.28, -0.02], [0.58, 0.2, -0.02]],
  [[0.58, 0.2, -0.02], [0.72, 0.12, -0.02]],
];

const ownedSystemLines: readonly LineSegment[] = [
  [[-0.58, -0.72, 0.02], [0.58, -0.72, 0.02]],
  [[0.58, -0.72, 0.02], [0.58, 0.72, 0.02]],
  [[0.58, 0.72, 0.02], [-0.58, 0.72, 0.02]],
  [[-0.58, 0.72, 0.02], [-0.58, -0.72, 0.02]],
  [[-0.46, 0.52, 0.05], [0.46, 0.52, 0.05]],
  [[0.46, 0.52, 0.05], [0.46, 0.2, 0.05]],
  [[0.46, 0.2, 0.05], [-0.46, 0.2, 0.05]],
  [[-0.46, 0.2, 0.05], [-0.46, 0.52, 0.05]],
  [[-0.46, 0.1, 0.05], [0.46, 0.1, 0.05]],
  [[0.46, 0.1, 0.05], [0.46, -0.22, 0.05]],
  [[0.46, -0.22, 0.05], [-0.46, -0.22, 0.05]],
  [[-0.46, -0.22, 0.05], [-0.46, 0.1, 0.05]],
  [[-0.46, -0.32, 0.05], [0.46, -0.32, 0.05]],
  [[0.46, -0.32, 0.05], [0.46, -0.58, 0.05]],
  [[0.46, -0.58, 0.05], [-0.46, -0.58, 0.05]],
  [[-0.46, -0.58, 0.05], [-0.46, -0.32, 0.05]],
  [[-0.34, 0.4, 0.08], [0.2, 0.4, 0.08]],
  [[-0.34, -0.02, 0.08], [0.16, -0.02, 0.08]],
  [[-0.34, -0.46, 0.08], [0.12, -0.46, 0.08]],
  [[0.3, 0.4, 0.08], [0.36, 0.4, 0.08]],
  [[0.26, -0.02, 0.08], [0.32, -0.02, 0.08]],
  [[0.22, -0.46, 0.08], [0.28, -0.46, 0.08]],
  [[-0.7, -0.62, -0.02], [-0.7, 0.62, -0.02]],
  [[-0.76, -0.62, -0.02], [-0.64, -0.62, -0.02]],
  [[-0.76, 0.62, -0.02], [-0.64, 0.62, -0.02]],
];
// Shared drafting marks make every subject read as one family of CAD studies.
// They stay behind the object outline and are built from the same particle
// population instead of introducing a separate illustration layer.
const cadRegistrationLines: readonly LineSegment[] = [
  [[-0.92, -0.78, -0.08], [-0.7, -0.78, -0.08]],
  [[0.7, -0.78, -0.08], [0.92, -0.78, -0.08]],
  [[-0.92, 0.78, -0.08], [-0.7, 0.78, -0.08]],
  [[0.7, 0.78, -0.08], [0.92, 0.78, -0.08]],
  [[-0.88, -0.82, -0.08], [-0.88, -0.68, -0.08]],
  [[-0.88, 0.68, -0.08], [-0.88, 0.82, -0.08]],
  [[0.88, -0.82, -0.08], [0.88, -0.68, -0.08]],
  [[0.88, 0.68, -0.08], [0.88, 0.82, -0.08]],
  [[-0.34, 0, -0.1], [-0.08, 0, -0.1]],
  [[0.08, 0, -0.1], [0.34, 0, -0.1]],
  [[0, -0.32, -0.1], [0, -0.08, -0.1]],
  [[0, 0.08, -0.1], [0, 0.32, -0.1]],
];

const architectureCadLines = [...shopDrawingLines, ...cadRegistrationLines] as const;
const disorderCadLines = [...clipboardLines, ...cadRegistrationLines] as const;
const flowCadLines = [...shopfloorLayoutLines, ...cadRegistrationLines] as const;
const structureCadLines = [...assemblyDrawingLines, ...cadRegistrationLines] as const;
const networkCadLines = [...posTerminalLines, ...cadRegistrationLines] as const;
export const ownershipCadLines = [...ownedSystemLines, ...cadRegistrationLines] as const;

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
  const segmentLengths = lines.map(([start, end]) =>
    Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]),
  );
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  const minimumPerSegment = count >= lines.length ? 1 : 0;
  const remaining = Math.max(0, count - minimumPerSegment * lines.length);
  const exactAllocations = segmentLengths.map(
    (length) => minimumPerSegment + (remaining * length) / Math.max(totalLength, Number.EPSILON),
  );
  const allocations = exactAllocations.map(Math.floor);
  let unassigned = count - allocations.reduce((sum, allocation) => sum + allocation, 0);

  exactAllocations
    .map((allocation, segmentIndex) => ({
      segmentIndex,
      remainder: allocation - Math.floor(allocation),
    }))
    .sort((a, b) => b.remainder - a.remainder || a.segmentIndex - b.segmentIndex)
    .forEach(({ segmentIndex }) => {
      if (unassigned <= 0) return;
      allocations[segmentIndex] += 1;
      unassigned -= 1;
    });

  let edgeIndex = 0;
  let allocationStart = 0;
  while (edgeIndex < lines.length - 1 && index >= allocationStart + allocations[edgeIndex]) {
    allocationStart += allocations[edgeIndex];
    edgeIndex += 1;
  }

  const [start, end] = lines[edgeIndex];
  const instancesOnSegment = Math.max(1, allocations[edgeIndex]);
  const localIndex = index - allocationStart;
  const edgeProgress = instancesOnSegment === 1 ? 0.5 : localIndex / (instancesOnSegment - 1);
  const segmentLength = segmentLengths[edgeIndex];
  return {
    position: lerpPoint(start, end, edgeProgress),
    tangent: normalize([end[0] - start[0], end[1] - start[1], end[2] - start[2]]),
    length: Math.max(0.35, Math.min(2.1, (segmentLength / instancesOnSegment / 0.14) * 0.9)),
  };
}

function architecturePoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, architectureCadLines);
}

function disorderPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, disorderCadLines);
}

function flowPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, flowCadLines);
}

function structurePoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, structureCadLines);
}

function networkPoint(index: number, count: number): FormPoint {
  return lineDrawingPoint(index, count, networkCadLines);
}

function ownershipPoint(index: number, count: number): FormPoint {
  const y = 1 - (index / Math.max(1, count - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  return {
    position: [Math.cos(angle) * radius * 0.7, y * 0.72, Math.sin(angle) * radius * 0.7],
    tangent: normalize([-Math.sin(angle), 0.2, Math.cos(angle)]),
    length: 0.7,
  };
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
    ownership: [],
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
      ownership: ownershipPoint(index, count),
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
    ownership: [],
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
      scale: 1,
      rotation: 0,
      ...shared,
    });
    targets.architecture.push({
      position: [column === 0 ? -0.5 : 0.5, 0.57 - row * 0.38, column === 0 ? 0.025 : -0.025],
      scale: 0.68,
      rotation: column === 0 ? -0.025 : 0.025,
      ...shared,
    });
    targets.disorder.push({
      position: [(random() - 0.5) * 1.65, (random() - 0.5) * 1.4, (random() - 0.5) * 0.12],
      scale: 0.58,
      rotation: (random() - 0.5) * 0.18,
      ...shared,
    });
    targets.flow.push({
      position: [-0.78 + progress * 1.56, Math.sin(progress * Math.PI * 2.25) * 0.55, ((index % 3) - 1) * 0.025],
      scale: 0.62,
      rotation: Math.cos(progress * Math.PI * 2.25) * 0.045,
      ...shared,
    });
    targets.structure.push({
      position: [column === 0 ? -0.48 : 0.48, 0.57 - row * 0.38, 0],
      scale: 0.62,
      rotation: column === 0 ? -0.035 : 0.035,
      ...shared,
    });
    targets.network.push({
      position: [Math.cos(angle) * 0.72, Math.sin(angle) * 0.63, Math.sin(angle * 2) * 0.04],
      scale: 0.56,
      rotation: Math.sin(angle) * 0.055,
      ...shared,
    });
    targets.ownership.push({
      position: [Math.cos(angle) * 0.78, Math.sin(angle) * 0.68, Math.sin(angle * 2) * 0.2],
      scale: 0.24,
      rotation: Math.sin(angle) * 0.08,
      ...shared,
    });
  }

  return targets;
}
