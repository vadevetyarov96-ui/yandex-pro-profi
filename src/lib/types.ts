export type CityId = "moscow";

export interface City {
  id: CityId;
  name: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  number: string;
  from?: string;
  title?: string;
  terminal?: string;
  status?: string;
  kind: "plane" | "train" | "suburban";
}

export interface HourBucket {
  /** Час прибытия транспорта, напр. "16:00" */
  hourLabel: string;
  hour: number;
  isPeak?: boolean;
}

export interface AirportHourStats extends HourBucket {
  flights: number;
  passengers: number;
  /** Окно выхода пассажиров, напр. "16:30–17:15" */
  exitWindow: string;
  /** К какому времени подъехать водителю */
  arriveBy: string;
  items: ScheduleItem[];
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
  /** Окно выхода пассажиров, напр. "16:10–16:45" */
  exitWindow: string;
  /** К какому времени подъехать водителю */
  arriveBy: string;
  items: ScheduleItem[];
}

export interface StationCardData {
  id: string;
  name: string;
  hours: StationHourStats[];
  longDistanceTotal: number;
  suburbanTotal: number;
  /** Пик только если текущий интервал пиковый */
  peak: boolean;
  tipArrive?: string;
  tipExit?: string;
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
  tip: {
    airport: string;
    arriveBy: string;
    exitWindow: string;
    passengers: number;
  } | null;
  source?: string;
}

export interface StationsPayload {
  updatedAt: string;
  cityId: CityId;
  stations: StationCardData[];
  tip: {
    station: string;
    arriveBy: string;
    exitWindow: string;
    longDistance: number;
  } | null;
  source?: string;
  suburbanNote?: string;
}

export interface CityEvent {
  id: string;
  title: string;
  category: string;
  categories: string[];
  startTime: string | null;
  endTime: string | null;
  timeLabel: string;
  /** True when the event has a concrete start time on this day */
  isTimed: boolean;
  placeName: string | null;
  address: string | null;
  subway: string | null;
  price: string | null;
  isFree: boolean;
  favoritesCount: number;
  ageRestriction: string | null;
  siteUrl: string | null;
  description: string | null;
  peak?: boolean;
}

export interface EventsDayBucket {
  dateKey: string;
  label: string;
  weekday: string;
  events: CityEvent[];
}

export interface EventsPayload {
  updatedAt: string;
  cityId: CityId;
  cityName: string;
  days: EventsDayBucket[];
  tip: {
    title: string;
    place: string;
    timeLabel: string;
    dayLabel: string;
    subway: string | null;
  } | null;
  source?: string;
}
