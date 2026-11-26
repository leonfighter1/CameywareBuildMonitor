// npm run sync: what the page shares with the rest of the company, copied in rather than written again (one home for
// each fact): the website's look (its tokens, Mantine's colours under them, its theme: the owner, 「要求UI要根据我们的SKILL
// 去做」) and the company's addresses (cameyware_api's packages/config). Each repository is beside this one in
// C:\CameywareCorpApps (or WEBSITE_REPO, API_REPO).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const website = process.env.WEBSITE_REPO ?? resolve(here, "..", "..", "website", "OfficialWebsite");
const api = process.env.API_REPO ?? resolve(here, "..", "..", "api", "cameyware_api");
const out = join(here, "src", "generated");
mkdirSync(out, { recursive: true });
for (const [from, to] of [
  [join(website, "src", "app", "site-tokens.css"), "site-tokens.css"],
  [join(website, "src", "app", "globals.css"), "globals.css"],
  [join(website, "src", "app", "theme.ts"), "theme.ts"],
  [join(website, "src", "generated", "tokens.css"), "tokens.css"],
  [join(api, "packages", "config", "addresses.json"), "addresses.json"],
]) {
  copyFileSync(from, join(out, to));
  console.log(`wrote src/generated/${to}`);
}
