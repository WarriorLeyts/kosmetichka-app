export const SMARTCAPTCHA_KEY = "ysc1_zPBcrJYGrC7s0G9CVZLokJ1ekpa0sKcqvAZoqBjObd8ec5f9";
export const CAPTCHA_HOSTS = ["https://smartcaptcha.cloud.yandex.ru", "https://smartcaptcha.yandexcloud.net"];
export type CaptchaStatus = "loading" | "ready" | "failed";
export type CaptchaProps = { onToken: (token: string) => void; onExpired?: () => void; onStatusChange?: (status: CaptchaStatus) => void };
