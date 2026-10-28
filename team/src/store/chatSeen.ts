import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "./storage";

/**
 * «Новое сообщение» from the customer: the last customer message id seen in each order's chat, kept on
 * this device. Messages older than the first start of this feature on the device count as seen
 * (no flood of marks on old orders).
 */
type ChatMarks = { lastCustomerMessageId?: number | null; lastCustomerMessageAt?: string | null; lastStaffMessageId?: number | null };

type SeenState = {
  since: number;
  seen: Record<string, number>;
  ready: boolean;
  markSeen: (orderId: number, messageId: number | null | undefined) => void;
};

const MAX_ORDERS = 400;

export const useChatSeen = create<SeenState>()(
  persist(
    (set) => ({
      since: 0,
      seen: {},
      ready: false,
      markSeen: (orderId, messageId) => {
        if (!messageId) return;
        set((s) => {
          if ((s.seen[orderId] ?? 0) >= messageId) return s;
          const entries: [string, number][] = Object.entries({ ...s.seen, [orderId]: messageId });
          // keep the newest orders only
          const trimmed = entries.length > MAX_ORDERS ? entries.sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, MAX_ORDERS) : entries;
          return { seen: Object.fromEntries(trimmed) as Record<string, number> };
        });
      },
    }),
    {
      name: "team-chat-seen",
      storage: persistStorage,
      partialize: (s) => ({ since: s.since, seen: s.seen }),
      onRehydrateStorage: () => () => {
        const s = useChatSeen.getState();
        useChatSeen.setState({ ready: true, since: s.since || Date.now() });
      },
    }
  )
);

/** the customer wrote something nobody answered and this device hasn't opened yet */
export function isUnread(s: Pick<SeenState, "since" | "seen" | "ready">, orderId: number, m: ChatMarks): boolean {
  const last = m.lastCustomerMessageId;
  if (!s.ready || !last) return false;
  if (m.lastStaffMessageId && m.lastStaffMessageId > last) return false;
  if ((s.seen[orderId] ?? 0) >= last) return false;
  if (m.lastCustomerMessageAt && Date.parse(m.lastCustomerMessageAt) < s.since) return false;
  return true;
}

/** hook: re-renders when the seen map changes */
export function useUnread(orderId: number, m: ChatMarks | null | undefined): boolean {
  const s = useChatSeen();
  return !!m && isUnread(s, orderId, m);
}
