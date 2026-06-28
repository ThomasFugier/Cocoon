# Versioning WeSpice

La version projet suit `major.minor.patch`.

- `patch` (`0.0.1`, `0.0.2`, etc.) : chaque commit ou build de développement.
- `minor` (`0.1.0`, `0.2.0`, etc.) : vrai changement poussé en production / store.
- `major` (`1.0.0`) : rupture majeure ou lancement stable assumé.

La version est synchronisée dans :

- `package.json`
- `package-lock.json`
- `app.json` (`expo.version`)
- `src/version.ts` pour l'affichage dans l'app

## Commandes

```bash
npm run version:show
npm run version:patch
npm run version:prod
npm run version:major
npm run version:set -- 0.0.12
```

Builds avec bump automatique :

```bash
npm run build:dev:ios
npm run build:dev:android
npm run build:prod:ios
npm run build:prod:android
```

## Hooks Git

Les hooks versionnés sont dans `.githooks/`.

```bash
npm run version:hooks
```

Une fois installés localement :

- `pre-commit` ajoute automatiquement un bump `patch` si le commit ne contient pas déjà un changement de version.
- `prepare-commit-msg` préfixe le message de commit avec la version, par exemple `v0.0.12 - Ajoute le chat photo`.

Pour un commit exceptionnel sans bump automatique :

```bash
$env:WESPICE_SKIP_VERSION_BUMP = "1"
git commit -m "message"
```

Pour une release prod :

```bash
npm run version:prod
git add package.json package-lock.json app.json src/version.ts
git commit -m "Release production"
git push
```
