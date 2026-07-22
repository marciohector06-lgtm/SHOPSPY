import axios from "axios";

interface RobotsGroup {
  userAgents: string[];
  disallow: string[];
}

const robotsCache = new Map<string, { groups: RobotsGroup[]; fetchedAt: number }>();
const ROBOTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export function parseRobotsTxt(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  // Uma vez que o grupo atual já recebeu uma regra (Disallow), uma nova
  // linha "User-agent" inicia um grupo novo em vez de estender o atual.
  let currentGroupHasRules = true;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (!line) continue;

    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!key) continue;

    if (key === "user-agent") {
      if (!current || currentGroupHasRules) {
        current = { userAgents: [], disallow: [] };
        groups.push(current);
        currentGroupHasRules = false;
      }
      current.userAgents.push(value);
    } else if (key === "disallow" && current) {
      if (value) current.disallow.push(value);
      currentGroupHasRules = true;
    }
  }

  return groups;
}

async function getRobotsGroups(origin: string): Promise<RobotsGroup[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) {
    return cached.groups;
  }

  try {
    const { data } = await axios.get<string>(`${origin}/robots.txt`, {
      timeout: 8000,
      responseType: "text",
    });
    const groups = parseRobotsTxt(typeof data === "string" ? data : "");
    robotsCache.set(origin, { groups, fetchedAt: Date.now() });
    return groups;
  } catch {
    // Sem robots.txt acessível: não bloqueia, mas também não conseguimos confirmar liberação.
    robotsCache.set(origin, { groups: [], fetchedAt: Date.now() });
    return [];
  }
}

/** Pura: dado o conjunto de grupos já parseados, decide se `path` é permitido. */
export function isPathAllowedForGroups(groups: RobotsGroup[], path: string): boolean {
  const wildcardGroup = groups.find((g) => g.userAgents.some((ua) => ua === "*"));
  if (!wildcardGroup) return true;

  return !wildcardGroup.disallow.some((rule) => path.startsWith(rule));
}

/**
 * Verifica se `path` é permitido pelo robots.txt de `origin` para o grupo
 * genérico (User-agent: *). Usado antes de cada request de scraping.
 */
export async function isPathAllowed(origin: string, path: string): Promise<boolean> {
  const groups = await getRobotsGroups(origin);
  return isPathAllowedForGroups(groups, path);
}
