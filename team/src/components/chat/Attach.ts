import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export type PickedFile = { uri: string; name: string; mime: string };
export type AttachHow = "library" | "camera" | "file";

export const ATTACH_OPTIONS: { value: AttachHow; label: string }[] = [
  { value: "library", label: "Фото или видео из галереи" },
  { value: "camera", label: "Снять фото или видео" },
  { value: "file", label: "Файл (PDF, документ, таблица)" },
];

function fromAsset(a: ImagePicker.ImagePickerAsset): PickedFile {
  const isVideo = a.type === "video";
  const ext = (a.uri.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
  const name = a.fileName || `${isVideo ? "video" : "photo"}-${Date.now()}.${ext}`;
  const mime = a.mimeType || (isVideo ? (ext === "mov" ? "video/quicktime" : "video/mp4") : ext === "png" ? "image/png" : "image/jpeg");
  return { uri: a.uri, name, mime };
}

/** opens the gallery / camera / file picker; null when cancelled */
export async function pickFile(how: AttachHow, photosOnly = false): Promise<PickedFile | null> {
  if (how === "file") {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return null;
    const d = r.assets[0];
    return { uri: d.uri, name: d.name || `file-${Date.now()}`, mime: d.mimeType || "application/octet-stream" };
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: photosOnly ? ["images"] : ["images", "videos"], quality: 0.8, videoMaxDuration: 120 };
  if (how === "camera") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) {
      Alert.alert("Нет доступа к камере", "Разрешите доступ к камере в настройках телефона.");
      return null;
    }
  }
  const r = how === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets?.[0]) return null;
  return fromAsset(r.assets[0]);
}

/** small pause so a closing sheet doesn't block the system picker (iOS shows one modal at a time) */
export const afterSheet = () => new Promise((r) => setTimeout(r, 450));
