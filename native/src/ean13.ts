/** EAN-13 → 95 modules ("1" = bar). Returns null when the code is not a valid EAN-13. */
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

export function ean13Modules(code: string): string | null {
  if (!/^\d{13}$/.test(code)) return null;
  const d = code.split("").map(Number);
  const sum = d.slice(0, 12).reduce((s, v, i) => s + v * (i % 2 ? 3 : 1), 0);
  if ((10 - (sum % 10)) % 10 !== d[12]) return null;
  const parity = PARITY[d[0]];
  let out = "101";
  for (let i = 1; i <= 6; i++) out += parity[i - 1] === "L" ? L[d[i]] : G[d[i]];
  out += "01010";
  for (let i = 7; i <= 12; i++) out += R[d[i]];
  return out + "101";
}

/** Runs of equal modules: [isBar, width][] — drawn as Views. */
export function runs(modules: string): [boolean, number][] {
  const r: [boolean, number][] = [];
  for (const ch of modules) {
    const bar = ch === "1";
    const last = r[r.length - 1];
    if (last && last[0] === bar) last[1]++;
    else r.push([bar, 1]);
  }
  return r;
}
