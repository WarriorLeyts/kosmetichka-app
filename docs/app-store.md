# Customer app: App Store preparation

Owner's delivery requirement: check the website and customer / staff apps on both platforms. Shared API fixes apply to all; native configuration changes require new binaries. The readiness audit and privacy draft are maintained in kosmetichka-b2b/docs/app-store/.

## Distribution modes

- Default / IOS_DISTRIBUTION=sideload: existing unsigned IPA + personal sideload installation; APNs entitlement removed after notification plugins finish. Runtime 5, Expo production channel for compatible updates.
- IOS_DISTRIBUTION=app-store: production APNs entitlement, iOS push registration enabled, runtime 5-app-store, Expo OTA disabled. Changes to this build go through reviewed App Store updates. native.yml selects this mode only in its manually invoked signed iOS job when Apple credentials are configured. Merging this preparation does not publish to TestFlight or App Store.
- Existing runtime-4 installations need a fresh IPA / APK for this release. No native capability change is advertised as installed through an OTA update.

Inspect the compiled configuration, including final plugin results:

```sh
cd native
npx expo config --type introspect --json > /tmp/sideload-config.json
IOS_DISTRIBUTION=app-store npx expo config --type introspect --json > /tmp/store-config.json
```

Check `_internal.modResults.ios.entitlements`: no aps-environment in sideload; production in store. Verify final Info.plist camera / microphone / photo descriptions. Looking only at app.json misses plugin overwrites.

Store builds still require an owner-controlled Apple Developer membership, matching provisioning / capabilities, APNs credentials in Expo and real-device/TestFlight validation. None of those credentials are created or uploaded by these changes.

## Public information

Public support: kosmetichka.upl@gmail.com, +7 938 905-94-94 (owner's corrected number). Profile → Контакты и документы is available without authentication. Required contact/privacy/agreement links cannot disappear when the CMS menu is empty. Contact values from CMS contact tables override offline fallback values.

## Account deletion

Profile → Мои данные → Удалить аккаунт requires the current password; forgotten-password recovery is linked. The shared backend clears profile, cart, favorites, waitlist, applicant proofs/files and push registrations. Order records, addresses and chat are not promised to be anonymized. Do not publish retention promises before checking the policy and external 1С / MAXMA / Bitrix24 records.

## Verification boundaries

Browser tests with mocked API may check guest legal links and account deletion confirmation without affecting real customers or creating orders. They do not verify iPhone camera, microphone, APNs or Apple's review. Use the real-device checklist in the backend audit for the final signed build.
