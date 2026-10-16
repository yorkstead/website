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
};

export type SystemFormTargets = Record<SystemFormName, SystemFormParticle[]>;

const boxEdges: readonly (readonly [Point3, Point3])[] = [
  [[-0.72, -0.72, -0.38], [0.72, -0.72, -0.38]],
  [[0.72, -0.72, -0.38], [0.72, 0.72, -0.38]],
  [[0.72, 0.72, -0.38], [-0.72, 0.72, -0.38]],
  [[-0.72, 0.72, -0.38], [-0.72, -0.72, -0.38]],
  [[-0.72, -0.72, 0.38], [0.72, -0.72, 0.38]],
  [[0.72, -0.72, 0.38], [0.72, 0.72, 0.38]],
  [[0.72, 0.72, 0.38], [-0.72, 0.72, 0.38]],
  [[-0.72, 0.72, 0.38], [-0.72, -0.72, 0.38]],
  [[-0.72, -0.72, -0.38], [-0.72, -0.72, 0.38]],
  [[0.72, -0.72, -0.38], [0.72, -0.72, 0.38]],
  [[0.72, 0.72, -0.38], [0.72, 0.72, 0.38]],
  [[-0.72, 0.72, -0.38], [-0.72, 0.72, 0.38]],
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

function corePoint(index: number, count: number): { position: Point3; tangent: Point3 } {
  const y = 1 - (index / Math.max(1, count - 1)) * 2;
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const angle = index * Math.PI * (3 - Math.sqrt(5));
  const position: Point3 = [Math.cos(angle) * radius * 0.68, y * 0.72, Math.sin(angle) * radius * 0.42];
  return { position, tangent: normalize([-Math.sin(angle), 0.24, Math.cos(angle)]) };
}

function architecturePoint(index: number, count: number): { position: Point3; tangent: Point3 } {
  const edgeProgress = (index / count) * boxEdges.length;
  const edgeIndex = Math.min(boxEdges.length - 1, Math.floor(edgeProgress));
  const [start, end] = boxEdges[edgeIndex];
  return {
    position: lerpPoint(start, end, edgeProgress - edgeIndex),
    tangent: normalize([end[0] - start[0], end[1] - start[1], end[2] - start[2]]),
  };
}

function disorderPoint(random: () => number): { position: Point3; tangent: Point3 } {
  const position: Point3 = [(random() - 0.5) * 1.75, (random() - 0.5) * 1.65, (random() - 0.5) * 0.95];
  const tangent: Point3 = normalize([random() - 0.5, random() - 0.5, random() - 0.5]);
  return { position, tangent };
}

function flowPoint(index: number, count: number): { position: Point3; tangent: Point3 } {
  const progress = index / Math.max(1, count - 1);
  const x = progress * 1.8 - 0.9;
  const angle = progress * Math.PI * 2.5;
  const lane = ((index % 4) - 1.5) * 0.045;
  const position: Point3 = [x, Math.sin(angle) * 0.42 + lane, Math.cos(angle) * 0.28 + lane * 0.6];
  return { position, tangent: normalize([1.8, Math.cos(angle) * Math.PI * 1.05, -Math.sin(angle) * Math.PI * 0.7]) };
}

function structurePoint(index: number, count: number): { position: Point3; tangent: Point3 } {
  const columns = Math.ceil(Math.sqrt(count * 1.35));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  const x = columns <= 1 ? 0 : (column / (columns - 1) - 0.5) * 1.55;
  const y = rows <= 1 ? 0 : (row / (rows - 1) - 0.5) * 1.35;
  const z = ((column + row) % 3 - 1) * 0.13;
  return { position: [x, y, z], tangent: (column + row) % 2 === 0 ? [1, 0, 0.14] : [0, 1, -0.14] };
}

function networkPoint(index: number, count: number): { position: Point3; tangent: Point3 } {
  const spokes = 7;
  const spoke = index % spokes;
  const ringIndex = Math.floor(index / spokes);
  const rings = Math.max(1, Math.ceil(count / spokes) - 1);
  const radius = 0.12 + (ringIndex / rings) * 0.75;
  const angle = (spoke / spokes) * Math.PI * 2 + ringIndex * 0.045;
  const position: Point3 = [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.88, Math.sin(ringIndex * 0.72 + spoke) * 0.22];
  return { position, tangent: normalize([Math.cos(angle), Math.sin(angle) * 0.88, 0.12]) };
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
      disorder: disorderPoint(random),
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
