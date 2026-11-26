import { expect, it } from "vitest";
import { DEMAND_NOTICE, quantityFromText } from "./demand";
it("accepts whole quantities without silently converting decimals, exponents or empty text", () => {
  expect(quantityFromText("15")).toBe(15);
  for (const text of ["", " ", "0", "-1", "1.5", "1e2", "10001"]) expect(quantityFromText(text)).toBeNull();
});
it("clearly explains the request is not a reservation", () => { expect(DEMAND_NOTICE).toContain("Это не бронь: товар не резервируется"); });
