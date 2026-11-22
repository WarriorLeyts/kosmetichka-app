<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Product delivery requirement
The owner requires changes to reach the website, the customer app (`native/`), and the manager app (`team/`) on both iOS and Android. For each feature, inspect both app implementations and update the relevant screens/API consumers; a website deploy alone does not complete app delivery. Verify APK and iPhone IPA workflows for affected apps and report failures. Customer OTA updates only reach compatible runtimes; Team currently requires installing a new build. iPhone release assets are unsigned and use the existing sideloading workflow. Do not claim installed apps updated merely because new files were built.

## Customer native runtime
Runtime 6 adds native photo compression (`expo-image-manipulator`). Installed runtime 5 binaries cannot receive this runtime through OTA; install the new APK/IPA once. App Store runtime is `6-app-store`; store updates remain disabled.
