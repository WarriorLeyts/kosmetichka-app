import Svg, { Defs, Image as SvgImage, LinearGradient, Line, Polygon, Stop, G } from "react-native-svg";

/*
 * The four flaps of the open box, drawn as real 3D flaps that turn on their fold lines and close
 * the box in place: first the short front and back flaps, then the two long side flaps meet in the
 * middle, then the pink tape with our logo appears. Coordinates are the mockup's pixels; the box rim
 * corners are measured on the box photo (box-body.png), so the closed flaps cover it exactly.
 */

const FL = [112, 1049];
const FR = [615, 1105];
const BR = [760, 976];
const BL = [282, 940];
const EY = -255; // one unit of height, screen px (up)
const L = 1.6;
const D = 1.0;
const H = 1.0;
const FB = 0.45; // short flaps (front/back)
const LR = 0.8; // long flaps (left/right) — meet in the middle
const OPEN = { front: 131, back: 172, left: 117, right: 158 }; // open angles, degrees

type Pt = [number, number];
type Name = "front" | "back" | "left" | "right";

function M(X: number, Y: number, Z: number): Pt {
  const u = X / L;
  const v = Z / D;
  const x = (1 - u) * (1 - v) * FL[0] + u * (1 - v) * FR[0] + u * v * BR[0] + (1 - u) * v * BL[0];
  const y = (1 - u) * (1 - v) * FL[1] + u * (1 - v) * FR[1] + u * v * BR[1] + (1 - u) * v * BL[1];
  return [x, y + (Y - H) * EY];
}

function flap(name: Name, deg: number): Pt[] {
  const r = (deg * Math.PI) / 180;
  const s = Math.sin(r);
  const c = Math.cos(r);
  let A: number[], B: number[], d: number[];
  if (name === "front") [A, B, d] = [[0, H, 0], [L, H, 0], [0, s * FB, c * FB]];
  else if (name === "back") [A, B, d] = [[L, H, D], [0, H, D], [0, s * FB, -c * FB]];
  else if (name === "left") [A, B, d] = [[0, H, D], [0, H, 0], [c * LR, s * LR, 0]];
  else [A, B, d] = [[L, H, 0], [L, H, D], [-c * LR, s * LR, 0]];
  const add = (p: number[]) => M(p[0] + d[0], p[1] + d[1], p[2] + d[2]);
  return [M(A[0], A[1], A[2]), M(B[0], B[1], B[2]), add(B), add(A)];
}

const area = (P: Pt[]) => P.reduce((s, p, i) => s + p[0] * P[(i + 1) % 4][1] - P[(i + 1) % 4][0] * p[1], 0) / 2;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => x * x * (3 - 2 * x);
const seg = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));

/** angle of each flap for closing progress t (0 = open, 1 = closed) */
function angles(t: number): Record<Name, number> {
  return {
    front: OPEN.front * (1 - seg(t, 0, 0.32)),
    back: OPEN.back * (1 - seg(t, 0.06, 0.38)),
    left: OPEN.left * (1 - seg(t, 0.36, 0.68)),
    right: OPEN.right * (1 - seg(t, 0.46, 0.82)),
  };
}

const pts = (P: Pt[]) => P.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

function FlapShape({ name, deg }: { name: Name; deg: number }) {
  const P = flap(name, deg);
  const outer = area(P) < 0; // the outer (violet) side faces us
  const r = (deg * Math.PI) / 180;
  // a little darker when the flap stands up; the closed lid is lit from above
  const shade = outer ? 0.22 * (1 - Math.abs(Math.cos(r))) : 0.14 * (1 - Math.abs(Math.sin(r)));
  return (
    <G>
      <Polygon points={pts(P)} fill={outer ? "url(#flapOut)" : "url(#flapIn)"} />
      {shade > 0.005 ? <Polygon points={pts(P)} fill="#140626" fillOpacity={shade} /> : null}
      {/* cardboard edge on the free side */}
      <Line x1={P[2][0]} y1={P[2][1]} x2={P[3][0]} y2={P[3][1]} stroke="#C7955E" strokeWidth={2.4} strokeLinecap="round" />
      <Polygon points={pts(P)} fill="none" stroke="#3A1470" strokeOpacity={0.25} strokeWidth={0.8} />
    </G>
  );
}

const LOGO = require("../../../assets/home2/logo-white.png");

/**
 * layer "back": flaps behind the products (only while the box is open);
 * layer "front": the front flap while open, every flap while closing, and the tape.
 */
export function BoxFlaps({ t, layer, width, height, viewBox }: { t: number; layer: "back" | "front"; width: number; height: number; viewBox: string }) {
  const a = angles(t);
  const closing = t > 0;
  // open: back/left flaps stand behind the products; the right and front flaps are in front of the walls
  const order: Name[] = layer === "back" ? (closing ? [] : ["back", "left"]) : closing ? ["back", "front", "left", "right"] : ["right", "front"];
  const tape = layer === "front" ? seg(t, 0.84, 1) : 0;
  const tw = 0.11;
  const top: Pt[] = [M(0.8 - tw, H, 0), M(0.8 + tw, H, 0), M(0.8 + tw, H, D), M(0.8 - tw, H, D)];
  const front: Pt[] = [M(0.8 - tw, H, 0), M(0.8 + tw, H, 0), M(0.8 + tw, H - 0.3, 0), M(0.8 - tw, H - 0.3, 0)];
  const lc = M(0.8, H - 0.15, 0);
  const ls = 52;
  return (
    <Svg width={width} height={height} viewBox={viewBox} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="flapOut" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6A2AD6" />
          <Stop offset="1" stopColor="#5420B8" />
        </LinearGradient>
        <LinearGradient id="flapIn" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF7CC6" />
          <Stop offset="1" stopColor="#E9439E" />
        </LinearGradient>
        <LinearGradient id="tape" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#EC3E98" />
          <Stop offset="0.5" stopColor="#FF6DB6" />
          <Stop offset="1" stopColor="#E23690" />
        </LinearGradient>
      </Defs>
      {order.map((n) => (
        <FlapShape key={n} name={n} deg={a[n]} />
      ))}
      {tape > 0 ? (
        <G opacity={tape}>
          <Polygon points={pts(top)} fill="url(#tape)" />
          <Polygon points={pts(front)} fill="url(#tape)" />
          <SvgImage href={LOGO} x={lc[0] - ls / 2} y={lc[1] - ls / 2} width={ls} height={ls} />
        </G>
      ) : null}
    </Svg>
  );
}
