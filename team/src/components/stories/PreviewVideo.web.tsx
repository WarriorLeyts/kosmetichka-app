export function PreviewVideo({ uri }: { uri: string }) {
  return <video src={uri} playsInline autoPlay muted controls style={{ width: "100%", height: "100%", objectFit: "contain", background: "#12091c" }} />;
}
