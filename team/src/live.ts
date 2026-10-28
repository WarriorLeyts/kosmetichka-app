import { AppState, Platform } from "react-native";
import { BASE_URL } from "./api";

/**
 * Live hints from the site (GET /api/team/live, Server-Sent Events): «order N changed» (new order, status, items, chat).
 * The open screens reload at once instead of waiting for their next poll (polling stays as a fallback).
 * Browser: EventSource. Phones: the same stream read through XMLHttpRequest (RN has no EventSource).
 * Runs only while signed in and while the app is in front.
 */
export type LiveHint = { t: "order"; id: number } | { t: "hello" };

type Listener = (h: LiveHint) => void;
const listeners = new Set<Listener>();
export function onLiveHint(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function emit(h: LiveHint) {
  for (const fn of [...listeners]) {
    try {
      fn(h);
    } catch {
      /* a screen's handler must not stop the others */
    }
  }
}

function parse(block: string) {
  const data = block
    .split("\n")
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim())
    .join("");
  if (!data) return;
  try {
    const h = JSON.parse(data) as LiveHint;
    if (h && typeof h.t === "string") emit(h);
  } catch {
    /* not ours */
  }
}

let wanted = false;
let close: (() => void) | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let failures = 0;
let appSub: { remove: () => void } | null = null;

function scheduleReconnect() {
  if (!wanted || retry) return;
  // 1 s, 2 s, 4 s … up to 30 s while the site doesn't answer
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(failures, 5));
  failures++;
  retry = setTimeout(() => {
    retry = null;
    connect();
  }, delay);
}

function connect() {
  if (!wanted || close) return;
  if (AppState.currentState !== "active" && Platform.OS !== "web") return;
  const url = BASE_URL + "/api/team/live";
  if (Platform.OS === "web" && typeof EventSource !== "undefined") {
    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = (e) => {
      failures = 0;
      parse(`data: ${e.data}`);
    };
    es.onerror = () => {
      // the browser retries by itself while the stream is reachable; a refused one (401 / 5xx) is closed
      if (es.readyState === EventSource.CLOSED) {
        close?.();
        scheduleReconnect();
      }
    };
    close = () => {
      es.close();
      close = null;
    };
    return;
  }
  const xhr = new XMLHttpRequest();
  let seen = 0;
  let buf = "";
  xhr.open("GET", url, true);
  xhr.withCredentials = true;
  xhr.setRequestHeader("Accept", "text/event-stream");
  xhr.setRequestHeader("Cache-Control", "no-cache");
  const read = () => {
    const text = xhr.responseText || "";
    if (text.length <= seen) return;
    buf += text.slice(seen);
    seen = text.length;
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (block.includes("data:")) {
        failures = 0;
        parse(block);
      }
    }
  };
  xhr.onprogress = read;
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 3) read();
    if (xhr.readyState === 4) {
      read();
      close = null;
      scheduleReconnect();
    }
  };
  xhr.send();
  close = () => {
    close = null;
    xhr.onreadystatechange = null;
    xhr.onprogress = null;
    xhr.abort();
  };
}

/** Signed in → listen; signed out → stop. Phones: paused in the background, back on resume. */
export function startLive() {
  if (wanted) return;
  wanted = true;
  failures = 0;
  connect();
  appSub = AppState.addEventListener("change", (st) => {
    if (Platform.OS === "web") return;
    if (st === "active") {
      failures = 0;
      connect();
    } else {
      if (retry) clearTimeout(retry);
      retry = null;
      close?.();
    }
  });
}

export function stopLive() {
  wanted = false;
  if (retry) clearTimeout(retry);
  retry = null;
  close?.();
  appSub?.remove();
  appSub = null;
}
