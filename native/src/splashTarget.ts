/** The home header's small logo (above «И») — the launch animation lands on it. */
export type Rect = { x: number; y: number; w: number; h: number };
type Measure = () => Promise<Rect | null>;
let measure: Measure | null = null;
export const setSplashTarget = (m: Measure | null) => {
  measure = m;
};
/** Measured at flight time, so a header that moved after mount is still hit exactly. */
export const getSplashTarget = (): Promise<Rect | null> => (measure ? measure().catch(() => null) : Promise.resolve(null));
