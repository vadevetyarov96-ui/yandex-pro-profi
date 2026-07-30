/** KudaGo public API client — https://docs.kudago.com/api/ */

export const KUDAGO_BASE = "https://kudago.com/public-api/v1.4";

export interface KudaGoPlace {
  id?: number;
  title?: string;
  address?: string;
  subway?: string;
  location?: string;
  site_url?: string;
  is_closed?: boolean;
  coords?: { lat?: number; lon?: number };
}

export interface KudaGoDateSlot {
  start: number;
  end: number;
  use_place_schedule?: boolean;
}

export interface KudaGoEvent {
  id: number;
  title: string;
  slug?: string;
  description?: string;
  price?: string;
  is_free?: boolean;
  categories?: string[];
  favorites_count?: number;
  age_restriction?: string | null;
  site_url?: string;
  place?: KudaGoPlace | null;
  dates?: KudaGoDateSlot[];
}

interface KudaGoListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const UA = "YandexProProfi/0.1 (+events; contact=local)";

export async function fetchKudaGoEvents(params: {
  location: string;
  actualSince: number;
  actualUntil: number;
  pageSize?: number;
  maxPages?: number;
}): Promise<KudaGoEvent[]> {
  const pageSize = Math.min(params.pageSize ?? 100, 100);
  const maxPages = params.maxPages ?? 6;
  const fields = [
    "id",
    "title",
    "slug",
    "description",
    "price",
    "is_free",
    "categories",
    "favorites_count",
    "age_restriction",
    "site_url",
    "place",
    "dates",
  ].join(",");

  const all: KudaGoEvent[] = [];
  let page = 1;

  while (page <= maxPages) {
    const url = new URL(`${KUDAGO_BASE}/events/`);
    url.searchParams.set("location", params.location);
    url.searchParams.set("actual_since", String(params.actualSince));
    url.searchParams.set("actual_until", String(params.actualUntil));
    url.searchParams.set("page_size", String(pageSize));
    url.searchParams.set("page", String(page));
    url.searchParams.set("fields", fields);
    url.searchParams.set("expand", "place");
    url.searchParams.set("order_by", "-favorites_count");
    url.searchParams.set("text_format", "text");
    url.searchParams.set("lang", "ru");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`KudaGo HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as KudaGoListResponse<KudaGoEvent>;
    all.push(...(data.results ?? []));
    if (!data.next) break;
    page += 1;
  }

  const seen = new Set<number>();
  return all.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
