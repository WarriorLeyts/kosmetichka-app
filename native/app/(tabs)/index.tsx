import { Redirect } from "expo-router";

// The app opens on the catalog, like the site's mobile navigation.
export default function Index() {
  return <Redirect href="/catalog" />;
}
