# Order service preview

This preview uses the actual customer and Team order screens, with a new customer status card,
a manager acknowledgement action and draft-only quick replies in the existing chat.
It is a proposal for review, not a production feature release.

- Build both apps with `EXPO_PUBLIC_ORDER_SERVICE_PREVIEW=1`.
- Set `WEB_BASE_URL` to `/assets/order-service-preview-v1/customer` and
  `/assets/order-service-preview-v1/team` respectively.
- Export to `/tmp/order-service-real-customer` and `/tmp/order-service-real-team`.
- Run `python3 previews/order-service/package.py` from the repository root.

The package injects `bootstrap.js` before either app starts. All API calls are handled locally,
uploads/beacons/live network streams are disabled, and app storage is namespaced separately
from production account state. The synthetic order is shared between the two preview views.
Catalog images and names are public product data; customer and staff accounts are fictional.
The one-hour estimate is illustrative and does not establish production service hours or an SLA.

Never publish a preview build as a production APK/IPA or replace the production website with it.
Production builds do not enable the preview flag.
