import type { City, CityId } from "./types";

export const CITIES: City[] = [
  { id: "moscow", name: "Москва" },
];

export const DEFAULT_CITY: CityId = "moscow";

export function getCity(id: CityId): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}
