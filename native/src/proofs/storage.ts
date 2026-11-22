import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Manipulator from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

export type ProofFile = { id: string; uri: string; name: string; mime: string; video: boolean; size: number };
export type ProofDraft = { customerId: number; token: string | null; registration: boolean; autoLogin: boolean; message: string; files: ProofFile[]; createdAt: number };
const KEY = "kosmetichka-proof-upload";
const directory = () => (FileSystem.documentDirectory ?? "") + "proof-uploads/";
const webUrls = new Map<string, string>();
let memoryDraft: ProofDraft | null = null;

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("kosmetichka-proof-files", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("files");
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(new Error("Не удалось сохранить фото на устройстве. Освободите место и повторите."));
  });
}
async function webFile(id: string, blob?: Blob, remove = false): Promise<Blob | undefined> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction("files", blob || remove ? "readwrite" : "readonly");
    const store = tx.objectStore("files");
    const request = remove ? store.delete(id) : blob ? store.put(blob, id) : store.get(id);
    let result: Blob | undefined;
    request.onsuccess = () => { result = !blob && !remove ? request.result : blob; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(new Error("Не удалось сохранить фото. Проверьте свободное место."));
    tx.onabort = () => reject(new Error("Сохранение фото прервано. Попробуйте ещё раз."));
  }); } finally { db.close(); }
}
async function durableFile(uri: string, id: string, ext: string): Promise<{ uri: string; size: number }> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    await webFile(id, blob);
    const saved = URL.createObjectURL(blob); webUrls.set(id, saved);
    return { uri: saved, size: blob.size };
  }
  if (!FileSystem.documentDirectory) throw new Error("Не удалось сохранить файл на устройстве");
  await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
  const saved = directory() + id + "." + ext;
  await FileSystem.copyAsync({ from: uri, to: saved });
  const info = await FileSystem.getInfoAsync(saved);
  if (!info.exists) throw new Error("Файл не сохранился. Выберите его ещё раз.");
  return { uri: saved, size: info.size };
}
export async function prepareProof(asset: ImagePickerAsset): Promise<ProofFile> {
  const video = asset.type === "video", id = `proof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  const ext = video ? (asset.fileName?.split(".").pop() || "mp4").toLowerCase() : "jpg";
  if (video && asset.fileSize && asset.fileSize > 50 * 1048576) throw new Error("Видео слишком большое — максимум 50 МБ. Выберите короткий ролик или фото.");
  let uri = asset.uri;
  if (!video) {
    const width = asset.width || 1600, height = asset.height || 1600;
    const actions: Manipulator.Action[] = Math.max(width, height) > 1600 ? [{ resize: width >= height ? { width: 1600 } : { height: 1600 } }] : [];
    try { uri = (await Manipulator.manipulateAsync(uri, actions, { compress: 0.76, format: Manipulator.SaveFormat.JPEG })).uri; }
    catch { throw new Error("Не удалось подготовить фото. Выберите другой снимок или файл JPG/PNG."); }
  }
  const saved = await durableFile(uri, id, ext);
  const file: ProofFile = { id, ...saved, video, name: `${id}.${ext}`, mime: video ? asset.mimeType || (ext === "mov" ? "video/quicktime" : "video/mp4") : "image/jpeg" };
  if (file.size > (video ? 50 : 15) * 1048576) { await removeProofFile(file); throw new Error("Файл слишком большой даже после подготовки. Выберите другой файл."); }
  return file;
}
export async function restoreProofFile(file: ProofFile): Promise<ProofFile> {
  if (Platform.OS === "web") {
    const cached = webUrls.get(file.id);
    if (cached) return { ...file, uri: cached };
    const blob = await webFile(file.id);
    if (!blob) return file; // The screen can offer selecting the file again; never silently discard it.
    const uri = URL.createObjectURL(blob); webUrls.set(file.id, uri);
    return { ...file, uri };
  }
  return file;
}
export async function removeProofFile(file: ProofFile) {
  if (Platform.OS === "web") {
    await webFile(file.id, undefined, true).catch(() => {});
    const uri = webUrls.get(file.id); if (uri) URL.revokeObjectURL(uri); webUrls.delete(file.id);
  } else if (file.uri.startsWith(directory())) await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {});
}
export async function saveProofDraft(draft: ProofDraft) {
  memoryDraft = draft;
  try { await AsyncStorage.setItem(KEY, JSON.stringify(draft)); return true; }
  catch { return false; }
}
export async function loadProofDraft(): Promise<ProofDraft | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  let draft: ProofDraft | null = memoryDraft;
  try { if (raw) draft = JSON.parse(raw); } catch { return null; }
  if (!draft || !Number.isInteger(draft.customerId) || !Array.isArray(draft.files) || draft.files.length > 10 || draft.files.some(f => !f || typeof f.uri !== "string" || typeof f.id !== "string")) return null;
  return { ...draft, files: await Promise.all(draft.files.map(restoreProofFile)) };
}
export async function clearProofDraft() {
  memoryDraft = null;
  await AsyncStorage.removeItem(KEY);
}

/** Explicit sign-out/account deletion must erase private proof drafts for that account. */
export async function discardAccountProofDraft(customerId: number) {
  const draft = await loadProofDraft();
  if (!draft || draft.customerId !== customerId) return;
  for (const file of draft.files) await removeProofFile(file);
  const latest = await loadProofDraft();
  if (latest?.customerId === customerId && latest.createdAt === draft.createdAt) await clearProofDraft();
}
