import { describe, expect, it } from "vitest";
import { barcodeList } from "./barcodes";

describe("all barcodes of a product", () => {
  it("the main one first, no repeats, the box marked", () => {
    expect(barcodeList("111", [{ barcode: "222", unitName: "коробка" }, { barcode: "111" }, { barcode: "333", unitName: null }])).toEqual(["111", "222 (коробка)", "333"]);
  });
  it("no main / plain strings / nothing", () => {
    expect(barcodeList(null, ["5", " 5 ", "6"])).toEqual(["5", "6"]);
    expect(barcodeList("", undefined)).toEqual([]);
  });
});
