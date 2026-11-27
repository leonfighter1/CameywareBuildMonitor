import addresses from "../generated/addresses.json";

/** The page's path on its host (/ops/): the company's address for it (packages/config's company.ops), as next.config.ts's basePath. */
export const BASE = new URL(addresses.company.ops).pathname;
