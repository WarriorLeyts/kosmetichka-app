/**
 * The iPhone build is installed without a paid Apple Developer account (SideStore / AltStore),
 * which can't sign the push entitlement — keep it out so installing still works. iPhone gets
 * «Уведомления» in the app (bell) without system push; Android gets real push via FCM.
 * Remove this plugin once the app is signed with a paid account (then iOS push works too).
 */
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withNoPushEntitlementIOS(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
};
