/** Sideload builds cannot sign APNs. Remove its entitlement after other plugins add it. */
const { withBaseMod } = require("expo/config-plugins");

module.exports = function withNoPushEntitlementIOS(config) {
  return withBaseMod(config, {
    platform: "ios",
    mod: "entitlements",
    isIntrospective: true,
    async action({ modRequest: { nextMod, ...modRequest }, ...rest }) {
      const result = await nextMod({ ...rest, modRequest });
      delete result.modResults["aps-environment"];
      if (result.ios?.entitlements) delete result.ios.entitlements["aps-environment"];
      return result;
    },
  });
};
