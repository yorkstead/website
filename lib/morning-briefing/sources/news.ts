import { fetchText, type Fetcher } from "@/lib/morning-briefing/sources/http";
import type { NewsCategory, NewsStory, SourceResult } from "@/lib/morning-briefing/types";

type Feed = { key: string; source: string; url: string; host: string; category: NewsCategory };

export const trustedNewsFeeds: Feed[] = [
  { key: "erp", source: "ERP Today", url: "https://erp.today/feed/", host: "erp.today", category: "ERP" },
  { key: "manufacturing", source: "Manufacturing Dive", url: "https://www.manufacturingdive.com/feeds/news/", host: "manufacturingdive.com", category: "manufacturing" },
  { key: "saas", source: "SaaStr", url: "https://www.saastr.com/feed/", host: "saastr.com", category: "SaaS" },
  { key: "restaurant", source: "Restaurant News Resource", url: "https://www.restaurantnewsresource.com/rss/category/technology", host: "restaurantnewsresource.com", category: "restaurant technology" },
  { key: "logistics", source: "FreightWaves", url: "https://www.freightwaves.com/feed/", host: "freightwaves.com", category: "logistics" },
];

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(":", "\\:");
    const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function link(block: string) {
  const textLink = tag(block, ["link"]);
  if (textLink) return textLink;
  const attributeLink = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  return attributeLink ? decodeEntities(attributeLink) : "";
}

function verifiedArticleURL(value: string, feed: Feed) {
  try {
    const url = new URL(value);
    const validHost = url.hostname === feed.host || url.hostname.endsWith(`.${feed.host}`);
    return url.protocol === "https:" && validHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseTrustedFeed(xml: string, feed: Feed, now = new Date()): NewsStory[] {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  const oldest = now.getTime() - 7 * 86_400_000;
  return blocks.flatMap((block) => {
    const title = tag(block, ["title"]);
    const url = verifiedArticleURL(link(block), feed);
    const published = tag(block, ["pubDate", "published", "updated", "dc:date"]);
    const timestamp = new Date(published).getTime();
    if (!title || !url || !Number.isFinite(timestamp) || timestamp < oldest || timestamp > now.getTime() + 300_000) return [];
    return [{ title, url, source: feed.source, category: feed.category, publishedAt: new Date(timestamp).toISOString() }];
  });
}

function configuredFeeds() {
  const configured = process.env.MORNING_BRIEFING_NEWS_FEEDS;
  if (configured === undefined) return trustedNewsFeeds;
  const keys = new Set(configured.split(",").map((key) => key.trim().toLowerCase()).filter(Boolean));
  return trustedNewsFeeds.filter((feed) => keys.has(feed.key));
}

function selectDiverseStories(stories: NewsStory[]) {
  const sorted = [...stories].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const selected: NewsStory[] = [];
  const categories = new Set<NewsCategory>();
  for (const story of sorted) {
    if (selected.length >= 3) break;
    if (categories.has(story.category)) continue;
    selected.push(story);
    categories.add(story.category);
  }
  for (const story of sorted) {
    if (selected.length >= 3) break;
    if (!selected.some((item) => item.url === story.url)) selected.push(story);
  }
  return selected;
}

export async function loadNewsSource(now = new Date(), fetcher: Fetcher = fetch): Promise<SourceResult<NewsStory[]>> {
  const feeds = configuredFeeds();
  if (!feeds.length) return { status: "not_configured", value: [] };
  const settled = await Promise.allSettled(feeds.map(async (feed) => parseTrustedFeed(await fetchText(feed.url, {
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "YorksteadMorningBriefing/1.0" },
  }, fetcher), feed, now)));
  const stories = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const successfulFeeds = settled.filter((result) => result.status === "fulfilled").length;
  if (!successfulFeeds) return { status: "unavailable", value: [] };
  return { status: successfulFeeds === feeds.length ? "ok" : "partial", value: selectDiverseStories(stories) };
}
