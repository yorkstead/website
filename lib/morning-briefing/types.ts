export const briefingSourceKeys = ["weather", "calendar", "tasks", "gmail", "opportunities", "news"] as const;

export type BriefingSourceKey = (typeof briefingSourceKeys)[number];
export type BriefingSourceStatus = "ok" | "partial" | "not_configured" | "unauthorized" | "unavailable";

export type SourceResult<T> = {
  status: BriefingSourceStatus;
  value: T;
};

export type ForecastPeriod = {
  name: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  wind: string;
};

export type WeatherLocation = {
  city: "Golden" | "Denver";
  periods: ForecastPeriod[];
};

export type CalendarItem = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  dateKey: string;
};

export type BriefingTask = {
  id: string;
  title: string;
  list: string;
  dueDate: string;
};

export type GmailFollowUp = {
  threadId: string;
  subject: string;
  waitingDays: number;
};

export type BriefingOpportunity = {
  id: number;
  name: string;
  company: string | null;
  projectType: string | null;
  status: string;
  qualificationStatus: string | null;
  followUpAt: string | null;
  createdAt: string;
};

export type NewsCategory = "ERP" | "manufacturing" | "SaaS" | "restaurant technology" | "logistics";

export type NewsStory = {
  title: string;
  url: string;
  source: string;
  category: NewsCategory;
  publishedAt: string;
};

export type BriefingInputs = {
  dateKey: string;
  tomorrowDateKey: string;
  timeZone: string;
  weather: SourceResult<WeatherLocation[]>;
  calendar: SourceResult<CalendarItem[]>;
  tasks: SourceResult<BriefingTask[]>;
  gmail: SourceResult<GmailFollowUp[]>;
  opportunities: SourceResult<BriefingOpportunity[]>;
  news: SourceResult<NewsStory[]>;
};

export type ComposedBriefing = {
  spokenText: string;
  wordCount: number;
  sourceStatus: Record<BriefingSourceKey, BriefingSourceStatus>;
};

export type StoredBriefing = ComposedBriefing & {
  briefingDate: string;
  generatedAt: string;
};
