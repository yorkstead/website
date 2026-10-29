import { countDueFollowUps, countOverdueFollowUps } from "@/lib/contact-inquiries";

type CountLoader = () => Promise<number>;
type Reporter = (message: string) => void;

export async function getDashboardDueFollowUps(
  load: CountLoader = countDueFollowUps,
  report: Reporter = console.error,
) {
  try {
    const count = await load();
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid due follow-up count");
    return count;
  } catch {
    report("Dashboard due follow-up count unavailable");
    return null;
  }
}

export async function getDashboardOverdueFollowUps(
  load: CountLoader = countOverdueFollowUps,
  report: Reporter = console.error,
) {
  try {
    const count = await load();
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid overdue follow-up count");
    return count;
  } catch {
    report("Dashboard overdue follow-up count unavailable");
    return null;
  }
}
