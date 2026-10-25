import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// one shared listener for the whole app (cards use this too)
let current = false;
const subs = new Set<(v: boolean) => void>();
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    current = v;
    subs.forEach((f) => f(v));
  })
  .catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
  current = v;
  subs.forEach((f) => f(v));
});

/** true when the phone's «reduce motion» setting is on. */
export function useReduceMotion() {
  const [reduce, setReduce] = useState(current);
  useEffect(() => {
    subs.add(setReduce);
    return () => {
      subs.delete(setReduce);
    };
  }, []);
  return reduce;
}
