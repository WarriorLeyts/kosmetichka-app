import { describe, expect, it } from "vitest";
import { money, plural, stockLabel } from "./format";

describe("formatting", () => {
  it("money: whole roubles, thin groups", () => {
    expect(money(1490).replace(/\s/g, " ")).toBe("1 490 ₽");
    expect(money(null)).toBe("0 ₽");
    expect(money(99.5).replace(/\s/g, " ")).toBe("100 ₽");
  });
  it("plural: 1 товар, 2 товара, 5 товаров, 11–14 товаров", () => {
    const f = (n: number) => plural(n, "товар", "товара", "товаров");
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map(f)).toEqual(["товар", "товара", "товаров", "товаров", "товаров", "товар", "товара", "товаров", "товаров"]);
  });
  it("stock label", () => {
    expect(stockLabel(0).tone).toBe("out");
    expect(stockLabel(null).tone).toBe("out");
    expect(stockLabel(3).tone).toBe("low");
    expect(stockLabel(11).text).toBe("Больше 10 шт.");
  });
});
