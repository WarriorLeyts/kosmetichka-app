import { StyleSheet } from "react-native";
import { CameraView } from "expo-camera";

/** Phone: the camera that reads barcodes (the browser version is BarcodeCamera.web.tsx). */
export function BarcodeCamera({ torch, onCode }: { torch: boolean; onCode?: (code: string) => void; onError?: (text: string) => void }) {
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
      onBarcodeScanned={onCode ? ({ data }) => onCode(String(data)) : undefined}
    />
  );
}
