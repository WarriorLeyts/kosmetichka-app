/**
 * Website only: runs a job on the user's next tap anywhere on the page. Browsers only show the
 * notification permission / install prompts from a user gesture; one tap serves one job (the next
 * job waits for the next tap). A job returns false if it no longer needs a tap.
 */
type Job = () => boolean;

const jobs: Job[] = [];
let listening = false;
let last = 0;

function onTap() {
  // touchend and the click after it are one tap
  const now = Date.now();
  if (now - last < 800) return;
  // a scroll / swipe ends with touchend too but is not a gesture: wait for a real tap
  const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  if (ua && !ua.isActive) return;
  last = now;
  while (jobs.length) {
    const job = jobs.shift()!;
    let used = false;
    try {
      used = job();
    } catch {
      /* ignore */
    }
    if (used) break;
  }
  if (!jobs.length) stop();
}

function stop() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("touchend", onTap, true);
  document.removeEventListener("click", onTap, true);
}

/** Queues a job for a tap; the result removes it. `first` puts it ahead of the others. */
export function onNextTap(job: Job, first = false): () => void {
  if (typeof document === "undefined") return () => {};
  if (first) jobs.unshift(job);
  else jobs.push(job);
  if (!listening) {
    listening = true;
    // touchend: a gesture on iOS / Android; click: a gesture with a mouse (pointerup from a mouse is not)
    document.addEventListener("touchend", onTap, true);
    document.addEventListener("click", onTap, true);
  }
  return () => {
    const i = jobs.indexOf(job);
    if (i >= 0) jobs.splice(i, 1);
    if (!jobs.length) stop();
  };
}
