export function smsRegistrationPhone(value: string): boolean {
  if (!/^[+\d\s().-]+$/.test(value.trim())) return false;
  const compact = value.replace(/[\s().-]/g, "");
  return /^(?:\+?7|8)\d{10}$/.test(compact) || /^\d{10}$/.test(compact);
}
export function registrationPhoneError(value: string, foreign: boolean): string | null {
  const compact = value.replace(/[\s().-]/g, "");
  if (foreign) {
    if (compact.startsWith("+7")) return "Номера с +7 подтверждаются по SMS. Отключите «Иностранный номер».";
    return /^\+[1-9]\d{6,14}$/.test(compact) ? null : "Введите иностранный номер с + и кодом страны";
  }
  if (compact.startsWith("+") && !compact.startsWith("+7")) return "Для номера с другим кодом страны включите «Иностранный номер».";
  return smsRegistrationPhone(value) ? null : "Введите номер телефона полностью";
}
