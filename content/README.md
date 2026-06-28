# WeSpice Card Content

`desire-packs.json` est la source éditable des packs de cartes.

Workflow recommandé :

1. Ouvre `tools/card-editor.html` dans un navigateur.
2. Charge `content/desire-packs.json`.
3. Filtre par catégorie ou recherche un mot, puis modifie les lignes compactes façon tableur.
4. Modifie les titres, textes, emojis, catégories, moods ou safety notes.
5. Exporte le JSON et remplace `content/desire-packs.json`.
6. Lance :

```bash
npm run cards:generate
```

Pour vérifier que le fichier généré est à jour :

```bash
npm run cards:check
```

Important : ce JSON est un outil de production, pas une source de vérité côté utilisateur. Dans l'app publiée, les cartes sont bundlées en TypeScript généré. Les achats et déblocages de packs doivent rester validés par le serveur/Supabase.
