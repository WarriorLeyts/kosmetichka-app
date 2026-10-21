import type { Order } from "./types";

/** Orders seen in the list, so the detail screen opens instantly with full data. */
export const orderCache = new Map<number, Order>();
