import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../ios";

type Block = { kind: "p" | "li"; text: string };
type Section = { title: string; blocks: Block[] };

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

/** Remove leftover markdown symbols (the site stores **Heading** and • bullets). */
function clean(s: string) {
  return s
    .replace(/\*\*|__/g, "")
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*[*•\-–—]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Same rules as the site's renderDescription: **…** = heading, • = list item, rest = paragraphs. */
export function parseDescription(text: string): Section[] {
  const sections: Section[] = [];
  let cur: Section = { title: "", blocks: [] };
  const push = () => {
    if (cur.blocks.length) sections.push(cur);
  };
  const addText = (raw: string) => {
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t) continue;
      // markdown heading line "## Title"
      if (/^#{1,6}\s+/.test(t)) {
        push();
        cur = { title: clean(t), blocks: [] };
        continue;
      }
      if (t.includes("•")) {
        t.split("•").map(clean).filter(Boolean).forEach((x) => cur.blocks.push({ kind: "li", text: x }));
      } else if (/^[*\-–—]\s+/.test(t)) {
        const x = clean(t);
        if (x) cur.blocks.push({ kind: "li", text: x });
      } else {
        const x = clean(t);
        if (x) cur.blocks.push({ kind: "p", text: x });
      }
    }
  };
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      push();
      cur = { title: clean(part), blocks: [] };
    } else addText(part);
  }
  push();
  return sections;
}

function sectionIcon(title: string): keyof typeof Ionicons.glyphMap | null {
  const t = title.toLowerCase();
  if (t.includes("кому")) return "people-outline";
  if (t.includes("примен") || t.includes("способ")) return "water-outline";
  if (t.includes("совет")) return "star-outline";
  if (t.includes("состав")) return "flask-outline";
  return null;
}

function itemIcon(label: string): keyof typeof Ionicons.glyphMap | null {
  const t = label.toLowerCase();
  if (t.includes("верхн")) return "nutrition-outline";
  if (t.includes("сердц") || t.includes("средн")) return "flower-outline";
  if (t.includes("базов") || t.includes("шлейф")) return "leaf-outline";
  return null;
}

/** «Label: value» → bold label + value (e.g. «Верхние ноты: яблоко, бергамот»). */
function splitLabel(s: string): [string, string] | null {
  const m = s.match(/^([^:]{2,40}):\s+(.+)$/);
  return m ? [m[1], m[2]] : null;
}

/** Product description as rounded panels, without visible markdown. Only filled sections are shown. */
function DescriptionBase({ text }: { text: string }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const sections = useMemo(() => parseDescription(text), [text]);
  if (!sections.length) return null;
  return (
    <View style={{ gap: 12 }}>
      {sections.map((s, si) => {
        const tip = /совет/i.test(s.title);
        const icon = sectionIcon(s.title);
        return (
          <View
            key={si}
            style={[
              styles.panel,
              { backgroundColor: tip ? (dark ? "rgba(232,44,135,0.16)" : "#FCEFF7") : c.cell },
              !dark && !tip && styles.shadow,
            ]}
          >
            <View style={styles.titleRow}>
              {icon ? <Ionicons name={icon} size={22} color={tip ? PINK : VIOLET} /> : null}
              <Text style={[styles.title, { color: tip ? PINK : c.label }]} accessibilityRole="header">
                {s.title || "О товаре"}
              </Text>
            </View>
            {s.blocks.map((b, bi) => {
              const lv = splitLabel(b.text);
              const ic = lv ? itemIcon(lv[0]) : null;
              if (lv && ic) {
                return (
                  <View key={bi} style={[styles.sub, { backgroundColor: dark ? "#2C2C2E" : "#F6F3FF" }]}>
                    <Ionicons name={ic} size={26} color={bi % 2 ? VIOLET : PINK} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subLabel, { color: c.label }]}>{lv[0]}</Text>
                      <Text style={[styles.subText, { color: c.secondary }]}>{lv[1]}</Text>
                    </View>
                  </View>
                );
              }
              const body = lv ? (
                <Text style={[styles.p, { color: c.label }]}>
                  <Text style={{ fontWeight: "600" }}>{lv[0]}: </Text>
                  {lv[1]}
                </Text>
              ) : (
                <Text style={[styles.p, { color: c.label }]}>{b.text}</Text>
              );
              return b.kind === "li" ? (
                <View key={bi} style={styles.li}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>{body}</View>
                </View>
              ) : (
                <View key={bi} style={{ marginTop: 4 }}>
                  {body}
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, padding: 16 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 21, fontWeight: "700", flexShrink: 1 },
  p: { fontSize: 16, lineHeight: 23 },
  li: { flexDirection: "row", gap: 10, marginTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PINK, marginTop: 9 },
  sub: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 12, marginTop: 8 },
  subLabel: { fontSize: 15, fontWeight: "600" },
  subText: { fontSize: 14, lineHeight: 19, marginTop: 2 },
});

export const Description = memo(DescriptionBase);
