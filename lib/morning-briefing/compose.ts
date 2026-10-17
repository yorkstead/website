import { addDaysToDateKey, dateKeyInTimeZone, daysBetweenDateKeys } from "@/lib/date-time";
import type { BriefingInputs, BriefingOpportunity, CalendarItem, ComposedBriefing, GmailFollowUp, NewsStory } from "@/lib/morning-briefing/types";

export const maximumBriefingWords = 1_800;

type Priority = { score: number; text: string };

function cleanSpeech(value: string, maximumWords = 22) {
  const normalized = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(Boolean);
  return words.length <= maximumWords ? normalized : `${words.slice(0, maximumWords).join(" ")}…`;
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function humanDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function timeLabel(item: CalendarItem, timeZone: string) {
  if (item.allDay) return "all day";
  const date = new Date(item.start);
  if (!Number.isFinite(date.getTime())) return "time unavailable";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(date);
}

function opportunityLabel(opportunity: BriefingOpportunity) {
  return cleanSpeech(opportunity.company || opportunity.name || `lead ${opportunity.id}`, 12);
}

function opportunityScore(opportunity: BriefingOpportunity, today: string) {
  const statusScore = opportunity.status === "proposal" ? 110 : opportunity.status === "qualified" || opportunity.qualificationStatus === "qualified" ? 90 : 55;
  if (!opportunity.followUpAt) return statusScore;
  const dueDate = dateKeyInTimeZone(new Date(opportunity.followUpAt));
  const daysUntilDue = daysBetweenDateKeys(today, dueDate);
  return statusScore + (daysUntilDue < 0 ? 35 : daysUntilDue === 0 ? 30 : daysUntilDue === 1 ? 15 : 0);
}

function priorityCandidates(input: BriefingInputs): Priority[] {
  const opportunities = input.opportunities.value.map((opportunity) => ({
    score: opportunityScore(opportunity, input.dateKey),
    text: `Advance ${opportunityLabel(opportunity)}${opportunity.projectType ? ` on ${cleanSpeech(opportunity.projectType, 10)}` : ""}.`,
  }));
  const followUps = input.gmail.value.map((followUp) => ({
    score: 65 + Math.min(followUp.waitingDays, 20),
    text: `Follow up on “${cleanSpeech(followUp.subject, 14)}”; your last message has waited ${followUp.waitingDays} ${followUp.waitingDays === 1 ? "day" : "days"}.`,
  }));
  const tasks = input.tasks.value.map((task) => {
    const days = daysBetweenDateKeys(input.dateKey, task.dueDate);
    return {
      score: days < 0 ? 85 : days === 0 ? 75 : 55,
      text: `${days < 0 ? "Overdue" : days === 0 ? "Due today" : "Due tomorrow"}: ${cleanSpeech(task.title)}.`,
    };
  });
  const calendar = input.calendar.value
    .filter((event) => event.dateKey === input.dateKey)
    .map((event) => ({ score: 45, text: `${timeLabel(event, input.timeZone)}: ${cleanSpeech(event.title)}.` }));
  return [...opportunities, ...followUps, ...tasks, ...calendar].sort((left, right) => right.score - left.score);
}

function highestValueRevenueMove(input: BriefingInputs) {
  const opportunity = [...input.opportunities.value].sort((left, right) => opportunityScore(right, input.dateKey) - opportunityScore(left, input.dateKey))[0];
  if (opportunity) {
    const context = opportunity.projectType ? ` about ${cleanSpeech(opportunity.projectType, 12)}` : "";
    return `Contact ${opportunityLabel(opportunity)}${context}, confirm the next decision, and put a dated next step on the record.`;
  }
  const followUp = [...input.gmail.value].sort((left, right) => right.waitingDays - left.waitingDays)[0];
  if (followUp) return `Close the loop on “${cleanSpeech(followUp.subject, 16)}” with one direct question that makes the next decision easy.`;
  return "Choose the warmest Yorkstead contact and ask for one twenty-minute workflow conversation this week.";
}

function weatherSection(input: BriefingInputs) {
  if (!input.weather.value.length) return "Weather. Live forecast data is unavailable; check conditions before leaving.";
  const locations = input.weather.value.map((location) => {
    const periods = location.periods.slice(0, 2).map((period) => `${period.name}: ${period.temperature} degrees ${period.temperatureUnit}, ${cleanSpeech(period.shortForecast, 14)}, with ${cleanSpeech(period.wind, 10)}`);
    return `${location.city}. ${periods.join(". ")}.`;
  });
  return `Weather. ${locations.join(" ")}`;
}

function scheduleSection(input: BriefingInputs) {
  const forDate = (dateKey: string) => input.calendar.value.filter((event) => event.dateKey === dateKey).slice(0, 6);
  const say = (items: CalendarItem[]) => items.length
    ? items.map((item) => `${timeLabel(item, input.timeZone)}, ${cleanSpeech(item.title)}`).join("; ")
    : "nothing scheduled";
  return `Schedule. Today: ${say(forDate(input.dateKey))}. Tomorrow: ${say(forDate(input.tomorrowDateKey))}.`;
}

function tasksSection(input: BriefingInputs) {
  const tasks = input.tasks.value.slice(0, 8);
  if (!tasks.length) return "Tasks. No dated Google Tasks are due by tomorrow.";
  return `Tasks. ${tasks.map((task) => {
    const days = daysBetweenDateKeys(input.dateKey, task.dueDate);
    const due = days < 0 ? "overdue" : days === 0 ? "today" : "tomorrow";
    return `${cleanSpeech(task.title)} is due ${due}`;
  }).join("; ")}.`;
}

function followUpSection(followUps: GmailFollowUp[]) {
  if (!followUps.length) return "Email follow-ups. No unanswered sent threads met the follow-up rule.";
  return `Email follow-ups. ${followUps.slice(0, 5).map((item) => `“${cleanSpeech(item.subject, 16)},” waiting ${item.waitingDays} ${item.waitingDays === 1 ? "day" : "days"}`).join("; ")}.`;
}

function opportunitySection(input: BriefingInputs) {
  if (!input.opportunities.value.length) return "Yorkstead opportunities. No qualified or due pipeline records are available.";
  return `Yorkstead opportunities. ${input.opportunities.value.slice(0, 5).map((item) => {
    const due = item.followUpAt ? dateKeyInTimeZone(new Date(item.followUpAt), input.timeZone) : null;
    const timing = due ? (daysBetweenDateKeys(input.dateKey, due) < 0 ? "follow-up overdue" : due === input.dateKey ? "follow-up due today" : `follow-up ${due}`) : "no dated follow-up";
    return `${opportunityLabel(item)}, ${cleanSpeech(item.status, 4)}, ${timing}`;
  }).join("; ")}.`;
}

function sourceNote(input: BriefingInputs) {
  const labels: Record<string, string> = { weather: "weather", calendar: "calendar", tasks: "tasks", gmail: "Gmail", opportunities: "pipeline", news: "news" };
  const missing = Object.entries(input)
    .filter(([key, value]) => labels[key] && typeof value === "object" && value && "status" in value && value.status !== "ok")
    .map(([key, value]) => `${labels[key]} ${String((value as { status: string }).status).replace("_", " ")}`);
  return missing.length ? `Source note. ${missing.join("; ")}. The available sections remain current.` : "All configured sources responded.";
}

function newsSection(stories: NewsStory[]) {
  const selected = stories.slice(0, 3);
  if (!selected.length) return "Industry news. No recent verified feed stories were available.";
  return `Industry news. ${selected.map((story, index) => `${index + 1}. From ${cleanSpeech(story.source, 8)}, ${cleanSpeech(story.title, 24)}. Category: ${story.category}.`).join(" ")}`;
}

function enforceWordBudget(text: string) {
  if (wordCount(text) <= maximumBriefingWords) return text;
  const marker = "\n\nIndustry news.";
  const newsStart = text.lastIndexOf(marker);
  if (newsStart < 0) return text.split(/\s+/).slice(0, maximumBriefingWords).join(" ");
  const news = text.slice(newsStart);
  const available = maximumBriefingWords - wordCount(news);
  return `${text.slice(0, newsStart).split(/\s+/).slice(0, Math.max(0, available)).join(" ")}${news}`;
}

export function composeMorningBriefing(input: BriefingInputs): ComposedBriefing {
  const priorities = priorityCandidates(input).slice(0, 5);
  const priorityText = priorities.length
    ? priorities.map((priority, index) => `${index + 1}. ${priority.text}`).join(" ")
    : "1. Protect a focused business-development block before reactive work begins.";
  const text = [
    `Good morning. Here is the Yorkstead briefing for ${humanDate(input.dateKey)}.`,
    `Top priorities. ${priorityText}`,
    `Highest-value revenue move. ${highestValueRevenueMove(input)}`,
    weatherSection(input),
    scheduleSection(input),
    tasksSection(input),
    followUpSection(input.gmail.value),
    opportunitySection(input),
    sourceNote(input),
    newsSection(input.news.value),
  ].join("\n\n");
  const spokenText = enforceWordBudget(text);
  return {
    spokenText,
    wordCount: wordCount(spokenText),
    sourceStatus: {
      weather: input.weather.status,
      calendar: input.calendar.status,
      tasks: input.tasks.status,
      gmail: input.gmail.status,
      opportunities: input.opportunities.status,
      news: input.news.status,
    },
  };
}

export function briefingDateKeys(date = new Date(), timeZone = "America/Denver") {
  const dateKey = dateKeyInTimeZone(date, timeZone);
  return { dateKey, tomorrowDateKey: addDaysToDateKey(dateKey, 1) };
}
