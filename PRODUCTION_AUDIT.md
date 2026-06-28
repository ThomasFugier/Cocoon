# WeSpice production audit

Date: 2026-06-28

## Local status

- Expo SDK 56 docs checked before changes: SDK reference, app config, notifications, image picker, SecureStore, AuthSession, development builds, and EAS JSON.
- `npm.cmd test`: pass, 7/7.
- `npm.cmd run cards:check`: pass.
- `npx.cmd tsc --noEmit`: pass.
- `npx.cmd expo install --check`: pass.
- `npx.cmd expo-doctor`: pass, 21/21.
- `npx.cmd expo export --platform web --output-dir dist-mobile-test`: pass, generated artifact removed after verification.

## Changes made locally

- `app.json`: added build-time native config for notifications, SecureStore, image picker permissions, and iOS export compliance.
- `eas.json`: switched EAS version source to remote, raised EAS CLI requirement, added development simulator profile, and added production submit scaffold.
- `App.tsx`: production builds now disable guest/local mode, debug presets, debug tab, and local purchase unlocks unless `EXPO_PUBLIC_ENABLE_LOCAL_MODE=true`.
- `.env.example` and `src/env.d.ts`: documented and typed `EXPO_PUBLIC_ENABLE_LOCAL_MODE`.

## Production readiness audit

### Expo / EAS

- Ready for development builds with `expo-dev-client` and EAS internal distribution.
- `expo-notifications` has a configured Android default channel matching `wespice-default`.
- `expo-image-picker` now requests only photo-library access for private chat photos.
- EAS still needs project linking and remote version initialization:

```bash
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest build:version:set -p ios
npx.cmd eas-cli@latest build:version:set -p android
npx.cmd eas-cli@latest build -p ios --profile development
npx.cmd eas-cli@latest build -p android --profile development
```

### Supabase

- Migrations define versioned schema, private `chat-attachments` bucket, RLS on sensitive tables, RPC-based couple/vote/chat flows, and Edge Functions for purchases and notifications.
- Match privacy is enforced by returning own votes plus only mutual matches through `get_revealable_matches(..., 1)`.
- Paid unlock tables do not expose client insert policies.
- Required production actions:

```bash
supabase link --project-ref <prod-project-ref>
supabase db push
supabase functions deploy verify-purchase
supabase functions deploy notify-event
supabase functions deploy notify-scheduled --no-verify-jwt
supabase secrets set REVENUECAT_SECRET_API_KEY=...
supabase secrets set WESPICE_NOTIFICATION_SECRET=...
supabase secrets set EXPO_ACCESS_TOKEN=... # only if Expo push security is enabled
```

- Supabase Auth console must enable Google and Apple and allow `wespice://auth`.
- Storage console should confirm `chat-attachments` is private, max 10 MB, and only image MIME types.
- Recommended follow-up: add a first-class account/data deletion Edge Function before store submission, including deletion of chat storage objects.

### RevenueCat

- Client calls RevenueCat, then validates via `verify-purchase`; server fetches RevenueCat subscriber data with the secret key before writing entitlements.
- Restore purchases is wired and revalidates server-side.
- Required RevenueCat setup:
  - Create iOS and Android apps.
  - Add products with the exact IDs listed in `README.md`.
  - Add entitlements with the exact entitlement IDs listed in `README.md`.
  - Attach products to offerings so `Purchases.getOfferings()` can find them.
  - Run sandbox tests for purchase, cancel/refund/expired entitlement behavior, and restore on a second install.

### Security

- RLS guard tests pass for profiles, members, votes, chat, push tokens, notification prefs, moods, events, purchases, and match reveals.
- Client-side local unlocks are no longer available in production bundles by default.
- Chat photos are private bucket objects and rendered through signed URLs.
- Review before production:
  - Confirm `get_my_couple_state` never leaks partner non-match votes.
  - Confirm storage direct delete policy is acceptable; currently couple members can delete objects under their couple path.
  - Confirm subscriptions, if any, revoke expired entitlements and derived unlock rows.

### QA on two real accounts

Must be done on real dev builds, not Expo Go:

- Google and Apple login on iOS/Android.
- Create couple on account A.
- Join with invite code on account B.
- Vote combinations: no/no reveal, no/yes hidden, curious/curious match, flame/curious match.
- Five responses/day limit and unlimited responses purchase bypass.
- Category pack purchase and restore purchase.
- Private chat text and photo.
- Signed photo URL behavior after refresh/restart.
- Chat expiry after 06:00 Europe/Paris and `cleanup_expired_chat`.
- Notification opt-in, token registration, chat notification, match notification, mood notification, scheduled daily reminder.
- Leave couple and re-create couple.
- Offline vote/message queue and retry after reconnect.

### Store submission

Still needed before App Store / Google Play submission:

- Privacy policy URL.
- Terms URL.
- In-app account/data deletion path.
- Store metadata, age rating, content descriptions, and screenshots.
- App Store Connect / Play Console product IDs matching RevenueCat.
- Apple and Google OAuth client configuration for the final bundle/package IDs.
