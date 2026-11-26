import { describe, expect, it } from "vitest";
import { registrationPhoneError, smsRegistrationPhone } from "./registrationPhone";
describe("registration phone mode", () => {
  it.each(["+7 (999) 123-45-67", "89991234567", "9991234567"])("keeps %s in the SMS flow", phone => {
    expect(smsRegistrationPhone(phone)).toBe(true);
    expect(registrationPhoneError(phone, false)).toBeNull();
  });
  it("explains the wrong foreign selection for +7 without accepting it in email mode", () => {
    expect(registrationPhoneError("+7 (999) 123-45-67", true)).toContain("Отключите «Иностранный номер»");
    expect(registrationPhoneError("+995 555 123 456", true)).toBeNull();
    expect(smsRegistrationPhone("+995 555 123 456")).toBe(false);
    expect(registrationPhoneError("+995 555 123 456", false)).toContain("включите «Иностранный номер»");
  });
  it.each(["123", "899912345678", "abc9991234567"])("rejects malformed %s before sending a code", phone => {
    expect(registrationPhoneError(phone, false)).toBeTruthy();
  });
});
