# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Project management source of truth

- Private Notion cockpit: https://app.notion.com/p/38da0b481db481388732ea78f77732f8
- Development process page: https://app.notion.com/p/396a0b481db481d89ff8de524898670d
- Use this Notion page as the project-management source of truth for WeSpice before starting substantial work.
- Task databases:
  - Tech / build / QA / docs / versioning: https://app.notion.com/p/528c184270b84bcfa4c46ab6c3a55fb3
  - Product features / UX flows: https://app.notion.com/p/98b14837613541a9bc94ae8d7da31989
- Status flow is intentionally simple: `Backlog`, `À faire`, `In Progress`, `Blocked`, `Done`.
- When the user asks for a batch of work, first translate the batch into Notion tasks or update existing tasks, then execute the work while referring back to those tasks.
- For every meaningful project change, add or update a Notion task. Small related edits can be grouped into one task; separate independent features, bugs, builds, or releases into separate tasks.
- Before implementation, mark the current task `In Progress` when tooling allows it. After verification, mark it `Done`; use `Blocked` only when progress depends on a user decision, external account, dashboard action, or unavailable credential.
- A project-manager agent should be able to reprioritize from Notion, so keep `Priorité`, `Responsable`, `Prochaine action`, and version fields meaningful.

# Versioning, commits, and local Android builds

- Before every commit, increment the micro/patch version with `npm run version:patch` unless the user explicitly asks for a different version bump.
- The version bump must be part of the same commit as the code changes. It updates `package.json`, `package-lock.json`, `app.json`, and `src/version.ts`.
- Do not create multiple commits with the same app version. If the current work will be committed, bump first and verify the new version with `npm run version:show`.
- Before an Android build, make sure the version has already been bumped for that build. A build must not reuse the previous committed build number/version label.
- For local Android builds, produce both a debug/dev-client APK and a release APK.
- Store local APK outputs in the root `APK/` folder with explicit versioned names, for example:
  - `WeSpice-v1.0.44-code1-debug-dev-client.apk`
  - `WeSpice-v1.0.44-code1-release.apk`
- Never delete or overwrite older versioned APKs in `APK/`. Keep previous APKs as build history. If rebuilding the exact same version is explicitly required, add a timestamp or short build suffix instead of replacing the old file.
- Do not use EAS for Android builds unless the user explicitly asks for EAS. Prefer the local Android SDK/Gradle workflow.
