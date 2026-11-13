import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ useWindowDimensions: () => ({ width: 390, height: 844 }) }));
import { lazyStyles } from "./lazyStyles";
import { scaleStyles, withFonts } from "./cardScale";

describe("theme style maps used by phone cart cards", () => {
  it("preserves row layout, photo size and quantity buttons when scaling to 0.7", () => {
    const styles = lazyStyles(() => ({
      item: { flexDirection: "row", gap: 14, padding: 14 },
      photo: { width: 112, height: 132 },
      stepper: { flexDirection: "row", alignItems: "center" },
      plus: { width: 44, height: 44, borderRadius: 22 },
      name: { fontSize: 17, lineHeight: 22 },
    }), () => 0);
    const phone = withFonts(scaleStyles(styles, 0.7), { name: { fontSize: 15, lineHeight: 19 } });
    expect(phone.item).toEqual({ flexDirection: "row", gap: 10, padding: 10 });
    expect(phone.photo).toEqual({ width: 78.5, height: 92.5 });
    expect(phone.stepper).toEqual({ flexDirection: "row", alignItems: "center" });
    expect(phone.plus).toEqual({ width: 31, height: 31, borderRadius: 15.5 });
    expect(phone.name).toEqual({ fontSize: 15, lineHeight: 19 });
  });
  it("supports keys, entries, spread and membership just like a normal StyleSheet map", () => {
    const styles = lazyStyles(() => Object.freeze({ row: Object.freeze({ flexDirection: "row" }) }), () => 0);
    expect(Object.keys(styles)).toEqual(["row"]);
    expect(Object.entries(styles)).toEqual([["row", { flexDirection: "row" }]]);
    expect({ ...styles }).toEqual({ row: { flexDirection: "row" } });
    expect("row" in styles).toBe(true);
    expect(Object.getOwnPropertyDescriptor(styles, "missing")).toBeUndefined();
  });
  it("rebuilds only when the theme revision changes, including for enumeration", () => {
    let version = 0;
    const build = vi.fn(() => ({ text: { color: version ? "#fff" : "#000" } }));
    const styles = lazyStyles(build, () => version);
    expect(build).not.toHaveBeenCalled();
    expect(styles.text.color).toBe("#000");
    expect({ ...styles }.text.color).toBe("#000");
    expect(build).toHaveBeenCalledTimes(1);
    version++;
    expect(Object.entries(styles)).toEqual([["text", { color: "#fff" }]]);
    expect(styles.text.color).toBe("#fff");
    expect(build).toHaveBeenCalledTimes(2);
  });
});
