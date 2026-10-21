import { router } from "expo-router";
import { Empty } from "./ui";

export function LoginRequired({ text }: { text: string }) {
  return <Empty icon="person-circle-outline" title="Войдите в аккаунт" text={text} action="Войти" onAction={() => router.push("/login")} />;
}
