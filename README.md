# WeSpice

Application mobile Expo / React Native pour couple : onboarding par code d'invitation, comptes Google/Apple via Supabase, envies privées, et tableau des matchs communs.

## Lancer

```bash
npm run start
```

Sur Windows PowerShell, si `npm` est bloqué par la policy locale, utilise :

```bash
npm.cmd run start
```

## Supabase

1. Crée un projet Supabase.
2. Applique les migrations dans `supabase/migrations`.
3. Copie `.env.example` vers `.env`.
4. Renseigne `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. Dans Supabase Auth, active les providers Google et Apple.
6. Ajoute le redirect URL mobile :

```txt
wespice://auth
```

Sans variables Supabase, l'app reste utilisable en mode test local.

Pour un setup local avec la Supabase CLI :

```bash
supabase db reset
```

`supabase/schema.sql` reste un snapshot complet pratique à relire, mais les changements prod doivent passer par `supabase/migrations`.

## Monetisation

Les achats passent par RevenueCat cote mobile, puis par la fonction Edge Supabase `verify-purchase`.
Le client ne debloque jamais directement un pack en production : il lance l'achat, la fonction Edge relit RevenueCat avec la cle serveur, puis ecrit les entitlements dans Supabase.

Variables Expo :

```txt
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
```

Secret Supabase :

```bash
supabase secrets set REVENUECAT_SECRET_API_KEY=sk_...
supabase functions deploy verify-purchase
supabase functions deploy delete-account
```

Produits et entitlements RevenueCat attendus :

```txt
wespice_pack_sensuel -> pack_sensuel
wespice_pack_seduction -> pack_seduction
wespice_pack_hot -> pack_hot
wespice_pack_jeux_defis -> pack_jeux_defis
wespice_pack_scenarios -> pack_scenarios
wespice_pack_kinky_soft -> pack_kinky_soft
wespice_pack_bdsm -> pack_bdsm
wespice_pack_plaisirs_explicites -> pack_plaisirs_explicites
wespice_pack_tabous -> pack_tabous
wespice_custom_cards_unlimited -> custom_cards_unlimited
wespice_no_ads -> no_ads
wespice_unlimited_responses -> unlimited_responses
```

`react-native-purchases` est un module natif : les achats ne se testent pas dans Expo Go. Utilise un dev build ou un build EAS iOS/Android.

## Notifications push

Les notifications utilisent `expo-notifications` cote app et l'API Expo Push cote Supabase Edge Functions.
L'app demande la permission seulement quand l'utilisateur active une preference de notification, puis enregistre un token par user/device dans `push_tokens`.

Variable Expo :

```txt
EXPO_PUBLIC_EAS_PROJECT_ID=...
```

Secrets Supabase :

```bash
supabase secrets set WESPICE_NOTIFICATION_SECRET=notif_...
supabase secrets set EXPO_ACCESS_TOKEN=... # optionnel si la securite Expo Push est activee
supabase functions deploy notify-event
supabase functions deploy notify-scheduled --no-verify-jwt
```

Evenements temps reel envoyes par `notify-event` :

```txt
chat_message -> preference Messages prives
new_match -> preference Nouveaux matchs
mood_aligned -> preference Envies croisees
```

Evenements planifies envoyes par `notify-scheduled` :

```txt
daily_reminder -> preference Carte du jour
promotion -> preference Packs et nouveautes
```

Exemple d'appel cron pour le rappel quotidien :

```bash
curl -X POST "$SUPABASE_FUNCTIONS_URL/notify-scheduled" \
  -H "Authorization: Bearer $WESPICE_NOTIFICATION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"daily_reminder"}'
```

`expo-notifications` demande un appareil physique et un dev build/EAS build. Expo Go ne permet pas de valider toute la chaine push en conditions production.

## Fiabilite offline

La session Supabase est stockee dans SecureStore sur iOS/Android. Les votes et messages envoyes hors ligne sont places dans une file locale `wespice-offline-queue-v1`, puis rejoues automatiquement quand la session et le couple remote sont disponibles.

Les messages avec photos gardent l'URI locale de l'image jusqu'au retry. Pour une prod plus dure, il faudra copier l'image dans un dossier persistant de l'app avant enqueue si les tests device montrent que le cache image est nettoye trop vite.

## Tests

```bash
npm test
npm run cards:check
npx tsc --noEmit
```

Les tests minimum couvrent les regles de match, quota quotidien, limite de cartes perso, leave couple, expiration chat et garde-fous RLS statiques.

## Versioning

La version WeSpice est affichée dans Profil > À propos et synchronisée entre `package.json`, `app.json` et `src/version.ts`.
La première mise en production démarre à `1.0.0`; ensuite chaque commit/build de dev ajoute un patch (`1.0.1`) et chaque vraie release prod ajoute un minor (`1.1.0`).

```bash
npm run version:hooks
npm run version:patch
npm run version:prod
```

Les hooks Git ajoutent un bump patch à chaque commit si aucun bump n'est déjà staged, puis préfixent le message de commit avec `vX.Y.Z`. Pour le détail du workflow build/prod, voir `VERSIONING.md`.

## Modifier les packs de cartes

Les cartes ne sont plus hardcodées directement dans l'app. La source éditable est :

```txt
content/desire-packs.json
```

Tu peux l'éditer à la main ou ouvrir le mini éditeur local :

```txt
tools/card-editor.html
```

Workflow :

```bash
npm run cards:generate
npm run cards:check
```

`cards:generate` transforme le JSON en `src/data/desires.generated.ts`, qui est le fichier réellement importé par l'app.

Anti-triche : le JSON est un outil de production, pas une donnée runtime modifiable par l'utilisateur. Pour les packs payants, le client peut afficher les cartes bundlées, mais le droit d'accès doit rester validé par Supabase/le serveur.

## Principe de confidentialité

Chaque utilisateur ne peut lire que ses propres votes. Les envies du partenaire ne sont jamais renvoyées au client sauf via la RPC `get_couple_matches`, qui ne retourne que les cartes où les deux partenaires ont répondu au moins `Pourquoi pas`.
