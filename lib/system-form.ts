export const systemFormSequence = [
  "core",
  "architecture",
  "disorder",
  "flow",
  "structure",
  "network",
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

const architectureLines: readonly (readonly [Point3, Point3])[] = [
  [[-0.78, -0.7, 0], [0.78, -0.7, 0]],
  [[0.78, -0.7, 0], [0.78, 0.7, 0]],
  [[0.78, 0.7, 0], [-0.78, 0.7, 0]],
  [[-0.78, 0.7, 0], [-0.78, -0.7, 0]],
  [[-0.52, -0.44, 0.06], [0.52, -0.44, 0.06]],
  [[0.52, -0.44, 0.06], [0.52, 0.44, 0.06]],
  [[0.52, 0.44, 0.06], [-0.52, 0.44, 0.06]],
  [[-0.52, 0.44, 0.06], [-0.52, -0.44, 0.06]],
  [[-0.78, -0.2, -0.05], [-0.52, -0.2, -0.05]],
  [[0.52, 0.2, -0.05], [0.78, 0.2, -0.05]],
  [[-0.18, -0.7, -0.05], [-0.18, -0.44, -0.05]],
  [[0.18, 0.44, -0.05], [0.18, 0.7, -0.05]],
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

function architecturePoint(index: number, count: number): FormPoint {
  const edgeProgress = (index / count) * architectureLines.length;
  const edgeIndex = Math.min(architectureLines.length - 1, Math.floor(edgeProgress));
  const [start, end] = architectureLines[edgeIndex];
  return {
    position: lerpPoint(start, end, edgeProgress - edgeIndex),
    tangent: normalize([end[0] - start[0], end[1] - start[1], end[2] - start[2]]),
    length: edgeIndex < 8 ? 0.9 : 0.65,
  };
}

function disorderPoint(index: number, random: () => number): FormPoint {
  const vertical = index % 7 === 0;
  const position: Point3 = [(random() - 0.5) * 1.75, (random() - 0.5) * 1.55, (random() - 0.5) * 0.22];
  return {
    position,
    tangent: vertical ? [0, 1, 0] : [1, 0, (random() - 0.5) * 0.08],
    length: 0.45 + random() * 1.15,
  };
}

function flowPoint(index: number, count: number): FormPoint {
  const lanes = count >= 70 ? 7 : 5;
  const steps = Math.ceil(count / lanes);
  const lane = index % lanes;
  const step = Math.floor(index / lanes);
  const progress = steps <= 1 ? 0 : step / (steps - 1);
  const vertical = index % 9 === 0;
  const x = progress * 1.7 - 0.85;
  const y = (lane / Math.max(1, lanes - 1) - 0.5) * 1.25 + Math.sin(progress * Math.PI * 2 + lane * 0.72) * 0.1;
  return {
    position: [x, y, ((lane + step) % 3 - 1) * 0.045],
    tangent: vertical ? [0, 1, 0] : [1, 0, 0],
    length: vertical ? 0.58 : 0.72 + ((lane + step) % 5) * 0.14,
  };
}

function structurePoint(index: number, count: number): FormPoint {
  const columns = Math.ceil(Math.sqrt(count * 1.35));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = columns <= 1 ? 0 : (column / (columns - 1) - 0.5) * 1.55;
  const y = rows <= 1 ? 0 : (row / (rows - 1) - 0.5) * 1.35;
  const z = ((column + row) % 3 - 1) * 0.045;
  return {
    position: [x, y, z],
    tangent: (column + row) % 4 === 0 ? [0, 1, 0] : [1, 0, 0],
    length: (column + row) % 4 === 0 ? 0.62 : 0.72 + ((column * 2 + row) % 5) * 0.12,
  };
}

function networkPoint(index: number, count: number): FormPoint {
  const spokes = 7;
  const spoke = index % spokes;
  const ringIndex = Math.floor(index / spokes);
  const rings = Math.max(1, Math.ceil(count / spokes) - 1);
  const radius = 0.12 + (ringIndex / rings) * 0.75;
  const angle = (spoke / spokes) * Math.PI * 2 + ringIndex * 0.045;
  const position: Point3 = [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.88, Math.sin(ringIndex * 0.72 + spoke) * 0.07];
  return {
    position,
    tangent: normalize([Math.cos(angle), Math.sin(angle) * 0.88, 0.02]),
    length: ringIndex % 3 === 0 ? 0.48 : 0.86,
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
  };

  for (let index = 0; index < count; index += 1) {
    const shared = {
      phase: random() * Math.PI * 2,
      spread: normalize([random() - 0.5, random() - 0.5, random() - 0.5]),
    };
    const forms = {
      core: corePoint(index, count),
      architecture: architecturePoint(index, count),
      disorder: disorderPoint(index, random),
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
