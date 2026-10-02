// Pure source snapshot. See docs/adr/0030-public-rework-demo.md.
export const RATES = {
  pallets: 18.50,
  wrap: 25.00,
  corners: 3.00,
  labor: 125.00,
  scale: 35.00,
  debris: 45.00,
};

export function calculateJobTotal(input: {
  palletsCount?: number;
  wrapCount?: number;
  cornersCount?: number;
  laborHours?: number;
  scaleCheck?: boolean;
  debrisFee?: boolean;
}): number {
  const pallets = Math.max(0, input.palletsCount ?? 0);
  const wrap = Math.max(0, input.wrapCount ?? 0);
  const corners = Math.max(0, input.cornersCount ?? 0);
  const labor = Math.max(0, input.laborHours ?? 0);
  const scale = input.scaleCheck ? RATES.scale : 0;
  const debris = input.debrisFee ? RATES.debris : 0;

  const total =
    pallets * RATES.pallets +
    wrap * RATES.wrap +
    corners * RATES.corners +
    labor * RATES.labor +
    scale +
    debris;

  return Math.round(total * 100) / 100;
}

