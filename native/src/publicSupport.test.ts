import { expect, it } from "vitest";
import { publicInfoMenu, publicSupport, SUPPORT } from "./publicSupport";
it("keeps privacy and support accessible when CMS menu is empty or hides built-in pages", () => {
  expect(publicInfoMenu([]).map((m) => m.path)).toEqual(["/contacts", "/privacy", "/agreement"]);
  const links = publicInfoMenu([{ slug: "privacy", title: "Моя политика", path: "/privacy" }, { slug: "custom", title: "Доставка", path: "/info/delivery" }]);
  expect(links.filter((m) => m.path === "/privacy")).toHaveLength(1);
  expect(links[0].title).toBe("Моя политика");
  expect(links.some((m) => m.path === "/info/delivery")).toBe(true);
  expect(publicInfoMenu([{ slug: "x", title: "x", path: "//external.example" }]).some((m) => m.path.startsWith("//"))).toBe(false);
  expect(SUPPORT.phone).toBe("+79389059494");
});

it("takes public phone and email from CMS contact tables without using bank account numbers", () => {
  expect(publicSupport([{ rows: [{ label: "Р/С", value: "79380000000" }, { label: "Телефон поддержки", value: "8 938 905-94-94" }, { label: "E-mail поддержки", value: "hello@example.test" }] }])).toMatchObject({ phone: "+79389059494", email: "hello@example.test" });
  expect(publicSupport([{ rows: [{ label: "E-mail", value: "javascript:alert(1)" }] }]).email).toBe(SUPPORT.email);
});
