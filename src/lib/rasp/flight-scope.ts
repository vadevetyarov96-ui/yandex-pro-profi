/** Domestic (RF) vs international arrival — drives exit-time estimates. */
export type FlightScope = "domestic" | "international";

/** Major Russian airport IATA codes (origin → domestic). */
const RU_IATA = new Set(
  [
    "SVO", "DME", "VKO", "ZIA", "LED", "AER", "RRR", "KRR", "ROV", "TGK",
    "SVX", "OVB", "KJA", "IKT", "VVO", "KHV", "UFA", "KZN", "CEK", "OMS",
    "MRV", "SIP", "ASF", "GOJ", "SCW", "PKV", "MMK", "ARH", "NBC", "TJM",
    "NSK", "BAX", "KEJ", "HTA", "YKS", "GDX", "PKC", "UUS", "ABA", "IJK",
    "PEE", "REN", "VOZ", "VOG", "RTW", "ULY", "CSY", "MCX", "STW", "NAL",
    "GRV", "OGZ", "IGT", "ESL", "AAQ", "GDZ", "EIE", "UIK", "BTK", "ULK",
    "NER", "DYR", "PWE", "BQJ", "CKH", "CYX", "KVK", "NNM", "AMV", "LDG",
    "CEE", "VLU", "EGO", "URS", "LPK", "IAR", "BZK", "KLF", "TYA", "OSW",
    "PEZ", "SKX", "KVX", "NYA", "NUX", "NOJ", "SGC", "NJC", "URJ", "EIK",
    "SLY", "HMA", "EYK", "IRM", "KGP", "OVS", "USK", "NNK", "IWA", "KZN",
    "UUD", "HTA", "BQS", "KXK", "DEE", "ITU", "EKS", "NGK", "BVV", "OHH",
    "ZZV", "KHV", "KXK", "EDN", "TLY", "NLI", "KDY", "SUY", "ONK",
  ].map((x) => x.toUpperCase()),
);

/** Common foreign origins into Moscow (lowercase) — force international. */
const FOREIGN_CITIES = new Set(
  [
    "анталья",
    "стамбул",
    "анкара",
    "даламан",
    "бодрум",
    "измир",
    "дубай",
    "шарм-эль-шейх",
    "хургада",
    "каир",
    "ларнака",
    "пафос",
    "тиват",
    "подгорица",
    "белград",
    "ереван",
    "тбилиси",
    "батуми",
    "баку",
    "минск",
    "ташкент",
    "самарканд",
    "алматы",
    "астана",
    "нур-султан",
    "бишкек",
    "душанбе",
    "ашхабад",
    "кишинёв",
    "кишинев",
    "рига",
    "вильнюс",
    "таллин",
    "таллинн",
    "хельсинки",
    "берлин",
    "франкфурт",
    "мюнхен",
    "париж",
    "рим",
    "милан",
    "мадрид",
    "барселона",
    "лондон",
    "амстердам",
    "вена",
    "прага",
    "варшава",
    "будапешт",
    "афины",
    "салоники",
    "пекин",
    "шанхай",
    "гуанчжоу",
    "сеул",
    "токио",
    "бангкок",
    "пхукет",
    "паттайя",
    "дели",
    "гоа",
    "тель-авив",
    "хайфа",
    "дойха",
    "доха",
    "абу-даби",
    "шарджа",
    "коломбо",
    "мале",
    "ганновер",
    "гамбург",
    "дюссельдорф",
    "никосия",
    "бейрут",
    "тегеран",
    "багдад",
    "эр-рияд",
    "джедда",
  ].map((x) => x.toLowerCase()),
);

/** Common Russian origin city / settlement names (lowercase). */
const RU_CITIES = new Set(
  [
    "москва",
    "санкт-петербург",
    "петербург",
    "спб",
    "сочи",
    "адлер",
    "краснодар",
    "ростов-на-дону",
    "ростов",
    "екатеринбург",
    "новосибирск",
    "красноярск",
    "иркутск",
    "владивосток",
    "хабаровск",
    "уфа",
    "казань",
    "челябинск",
    "омск",
    "минеральные воды",
    "симферополь",
    "астрахань",
    "нижний новгород",
    "сыктывкар",
    "псков",
    "мурманск",
    "архангельск",
    "набережные челны",
    "нижнекамск",
    "тюмень",
    "норильск",
    "барнаул",
    "кемерово",
    "чита",
    "якутск",
    "магадан",
    "петропавловск-камчатский",
    "южно-сахалинск",
    "абакан",
    "ижевск",
    "пермь",
    "оренбург",
    "воронеж",
    "волгоград",
    "саратов",
    "ульяновск",
    "чебоксары",
    "махачкала",
    "ставрополь",
    "нальчик",
    "грозный",
    "владикавказ",
    "элиста",
    "анапа",
    "геленджик",
    "калининград",
    "белгород",
    "курск",
    "липецк",
    "ярославль",
    "брянск",
    "калуга",
    "тула",
    "орёл",
    "орел",
    "пенза",
    "саранск",
    "киров",
    "сургут",
    "нижневартовск",
    "ханты-мансийск",
    "новый уренгой",
    "ноябрьск",
    "салехард",
    "томск",
    "новокузнецк",
    "благовещенск",
    "улан-удэ",
    "петрозаводск",
    "вологда",
    "череповец",
    "тверь",
    "рязань",
    "тамбов",
    "смоленск",
    "иваново",
    "кострома",
    "магнитогорск",
    "нижний тагил",
    "стерлитамак",
    "тольятти",
    "самара",
    "новороссийск",
    "дербент",
  ].map((x) => x.toLowerCase()),
);

const RU_COUNTRY = new Set([
  "россия",
  "russia",
  "russian federation",
  "рф",
  "ru",
  "rus",
]);

function normalizePlace(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/^г\.\s*/u, "")
    .replace(/^город\s+/u, "")
    .replace(/\s+/g, " ");
}

function originFromTitle(title?: string): string | undefined {
  if (!title) return undefined;
  if (title.includes(" — ")) return title.split(" — ")[0]?.trim();
  if (title.includes(" - ")) return title.split(" - ")[0]?.trim();
  return undefined;
}

export interface FlightScopeHints {
  from?: string;
  title?: string;
  originIata?: string;
  originCountry?: string;
  /** Explicit board flag when present */
  isInternational?: boolean;
}

/**
 * Classify arrival as domestic (RF) or international.
 * Unknown origins default to domestic (majority of Moscow arrivals).
 */
export function resolveFlightScope(hints: FlightScopeHints): FlightScope {
  if (hints.isInternational === true) return "international";
  if (hints.isInternational === false) return "domestic";

  const country = normalizePlace(hints.originCountry);
  if (country) {
    if (RU_COUNTRY.has(country)) return "domestic";
    return "international";
  }

  const iata = hints.originIata?.trim().toUpperCase();
  if (iata) {
    if (RU_IATA.has(iata)) return "domestic";
    // Non-RU IATA → international
    if (/^[A-Z]{3}$/.test(iata)) return "international";
  }

  const place = normalizePlace(hints.from || originFromTitle(hints.title));
  if (place) {
    if (RU_CITIES.has(place)) return "domestic";
    for (const city of RU_CITIES) {
      if (place.includes(city) || city.includes(place)) return "domestic";
    }
    if (FOREIGN_CITIES.has(place)) return "international";
    for (const city of FOREIGN_CITIES) {
      if (place.includes(city) || city.includes(place)) return "international";
    }
  }

  // Unknown origin without country/IATA → domestic (safer default for Moscow mix)
  return "domestic";
}
