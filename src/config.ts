import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-when2meet",
  description: "Ephemeral availability picker — QR-join, no Doodle account, no email",
  accentHex: "#3aa8a1",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
