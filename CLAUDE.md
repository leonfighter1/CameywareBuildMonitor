# CameywareBuildMonitor: agent instructions

The build monitor's page (禄命秘解 S77; the plan and its records are in lumingApp's docs/tech-plan.md and docs/agent).
Its backend is cameyware_api's `services/build-monitor` (`/ops/v1`): front end here, back end there (the owner,
2026-11-26: 「要注意前后端分离，需要放到company api project里去」).

- **UI by the company's skill** (the owner: 「要求UI要根据我们的SKILL去做」): the website's skill
  (`C:\CameywareCorpApps\website\OfficialWebsite\.claude\skills\website`): Mantine, TanStack Query, the company's tokens
  (`var(--t-…)`) and theme, synced into `src/generated` by `npm run sync` (never edited here); the 1620 container; a
  state never by colour alone; light, dark and a phone's width looked at before calling it done.
- **One home:** the addresses come from cameyware_api's packages/config (synced); the API's shapes mirror
  services/build-monitor's (`src/lib/types.ts`): change both together.
- **Lists of records** (runs): pages, filters with counts, search; no 删除 (a log, 90 days kept by the backend).
- **Never itself:** the monitor shows the other services; its own container, image and files are left out by the agent.
- **Checks:** `npm run lint`, `npm run build`, and a look at the page (both themes, a phone). Commit and tag; the owner
  pushes. Deploy: `npm run deploy:preview` in `C:\CameywareCorpApps\server` (CameywareServer).
