export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function extractCdata(tag: string, xml: string): string {
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`)
  );
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return plainMatch?.[1]?.trim() ?? "";
}

/**
 * Fetches Google News RSS for a query term and returns parsed articles.
 * Only runs server-side (no CORS issue).
 */
export async function fetchCompanyNews(
  companyName: string
): Promise<NewsArticle[]> {
  const query = `${companyName} BRVM Afrique`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=CI&ceid=CI:fr`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BRVMAnalyzer/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];

    const xml = await res.text();

    // Split on <item> tags — avoids RegExp iterator issues
    const segments = xml.split("<item>").slice(1, 6);
    const items = segments.map((s) => {
      const end = s.indexOf("</item>");
      return end !== -1 ? s.substring(0, end) : s;
    });

    return items
      .map((item) => {
        const title = extractCdata("title", item);
        const rawLink = extractCdata("link", item);
        const fallbackLink = item.match(/<link\/>(https?:[^\s<]+)/)?.[1] ?? "";
        const link = rawLink.length > 0 ? rawLink : fallbackLink;
        const pubDate = extractCdata("pubDate", item);
        const source = extractCdata("source", item);
        return { title, link, pubDate, source };
      })
      .filter((a) => a.title.length > 0 && a.link.length > 0)
      .sort((a, b) => {
        const da = new Date(a.pubDate).getTime();
        const db = new Date(b.pubDate).getTime();
        return (isNaN(db) ? 0 : db) - (isNaN(da) ? 0 : da);
      });
  } catch {
    return [];
  }
}

/** Format a pubDate string to a readable relative or absolute date with exact time */
export function formatNewsDate(pubDate: string): string {
  try {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return pubDate;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);

    const hhmm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (diffMin < 5) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffH < 24) return `Aujourd'hui ${hhmm}`;
    if (diffD === 1) return `Hier ${hhmm}`;
    if (diffD < 7) return `Il y a ${diffD}j · ${hhmm}`;
    return d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: diffD > 365 ? "numeric" : undefined,
    });
  } catch {
    return pubDate;
  }
}

/** Returns true if article is less than 6 hours old */
export function isRecentArticle(pubDate: string): boolean {
  try {
    const d = new Date(pubDate);
    if (isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 6 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
