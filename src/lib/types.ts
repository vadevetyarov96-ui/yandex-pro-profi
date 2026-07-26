export type CityId = "moscow";

export interface City {
  id: CityId;
  name: string;
}

export interface HourBucket {
  hourLabel: string; // "15:00"
  hour: number;
  isPeak?: boolean;
}

export interface AirportHourStats extends HourBucket {
  flights: number;
  passengers: number;
  windowLabel: string; // "14:30–15:30"
  adviceArrive?: string;
  adviceExit?: string;
}

export interface AirportCardData {
  id: string;
  name: string;
  code: string;
  hours: AirportHourStats[];
  nowFlights: number;
  peak: boolean;
  tipArrive?: string;
  tipExit?: string;
}

export interface StationHourStats extends HourBucket {
  longDistance: number;
  suburban: number;
  total: number;
  windowLabel: string; // "14:45–15:45"
}

export interface StationCardData {
  id: string;
  name: string;
  hours: StationHourStats[];
  longDistanceTotal: number;
  suburbanTotal: number;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  cityId: CityId;
}

export interface AirportsPayload {
  updatedAt: string;
  cityId: CityId;
  airports: AirportCardData[];
  tip: { airport: string; arriveBy: string; passengers: number } | null;
}

export interface StationsPayload {
  updatedAt: string;
  cityId: CityId;
  stations: StationCardData[];
  tip: { station: string; arriveBy: string; longDistance: number } | null;
}
