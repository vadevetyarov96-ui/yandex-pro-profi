import type { CityId } from "@/lib/types";

export type RaspTransport = "plane" | "train" | "suburban";

export interface RaspLocation {
  id: string;
  name: string;
  /** Numeric id used on rasp.yandex.ru/station/{n}/ */
  raspId: number;
  /** Yandex code with prefix, e.g. s9600213 */
  code: string;
  kind: "airport" | "station";
  iata?: string;
  paxPerFlight?: number;
}

export const MOSCOW_AIRPORTS: RaspLocation[] = [
  {
    id: "svo",
    name: "Шереметьево",
    raspId: 9600213,
    code: "s9600213",
    kind: "airport",
    iata: "SVO",
    paxPerFlight: 165,
  },
  {
    id: "dme",
    name: "Домодедово",
    raspId: 9600216,
    code: "s9600216",
    kind: "airport",
    iata: "DME",
    paxPerFlight: 155,
  },
  {
    id: "vko",
    name: "Внуково",
    raspId: 9600215,
    code: "s9600215",
    kind: "airport",
    iata: "VKO",
    paxPerFlight: 140,
  },
  {
    id: "zia",
    name: "Жуковский",
    raspId: 9850865,
    code: "s9850865",
    kind: "airport",
    iata: "ZIA",
    paxPerFlight: 120,
  },
];

export const MOSCOW_STATIONS: RaspLocation[] = [
  { id: "vostochny", name: "Восточный вокзал", raspId: 9879173, code: "s9879173", kind: "station" },
  { id: "leningradsky", name: "Ленинградский вокзал", raspId: 2006004, code: "s2006004", kind: "station" },
  { id: "kazansky", name: "Казанский вокзал", raspId: 2000003, code: "s2000003", kind: "station" },
  { id: "yaroslavsky", name: "Ярославский вокзал", raspId: 2000002, code: "s2000002", kind: "station" },
  { id: "kursky", name: "Курский вокзал", raspId: 2000001, code: "s2000001", kind: "station" },
  { id: "kievsky", name: "Киевский вокзал", raspId: 2000007, code: "s2000007", kind: "station" },
  { id: "belorussky", name: "Белорусский вокзал", raspId: 2000006, code: "s2000006", kind: "station" },
  { id: "paveletsky", name: "Павелецкий вокзал", raspId: 2000005, code: "s2000005", kind: "station" },
  { id: "rizhsky", name: "Рижский вокзал", raspId: 2000008, code: "s2000008", kind: "station" },
  { id: "savyolovsky", name: "Савёловский вокзал", raspId: 2000009, code: "s2000009", kind: "station" },
];

export function locationsForCity(cityId: CityId, kind: "airport" | "station") {
  if (cityId !== "moscow") return [];
  return kind === "airport" ? MOSCOW_AIRPORTS : MOSCOW_STATIONS;
}
