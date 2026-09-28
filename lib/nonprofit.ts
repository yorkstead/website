export const sections = [
  { title: "About you", description: "A name and email are all you need to send this form. Everything else can wait.", fields: [
    ["name", "Your name", "text"], ["email", "Your email", "email"], ["legalName", "Full legal name (if different)", "text"], ["mailingAddress", "Mailing address", "textarea"], ["phone", "Phone number", "tel"],
  ] },
  { title: "People behind the pantry", description: "Share what you know. You can leave undecided roles blank.", fields: [
    ["registeredAgent", "Registered agent name and address (or write ‘use my information’)", "textarea"], ["president", "Proposed president", "text"], ["treasurer", "Proposed treasurer", "text"], ["secretary", "Proposed secretary", "text"], ["otherDirectors", "Other proposed board members", "textarea"], ["relatedDirectors", "Are any directors related? If so, how?", "textarea"],
  ] },
  { title: "Your pantry plans", description: "Estimates are welcome. No need to have everything figured out.", fields: [
    ["physicalAddress", "Proposed pantry physical address", "textarea"], ["location", "Operating location or type of space", "text"], ["hours", "Proposed operating days and hours", "textarea"], ["budget", "Approximate first-year budget ($)", "text"], ["annualRevenue", "Expected annual donations/revenue (under $50,000, $50,000, over $50,000, or unsure)", "text"], ["families", "Estimated families served (include per week or per month)", "text"], ["coldStorage", "Will you have refrigerators or freezers?", "text"], ["foodSources", "Possible food donors or sources", "textarea"], ["priorWork", "What work from Mom’s Closet would you like to continue?", "textarea"],
  ] },
  { title: "Sponsorship", description: "No sponsor yet? Just list any possibilities and skip the rest.", fields: [
    ["possibleSponsors", "Possible sponsoring organizations", "textarea"], ["sponsorName", "Sponsor’s legal organization name", "text"], ["officer", "Authorized sponsor officer’s name and title", "text"], ["sponsorAddress", "Sponsor’s mailing address", "textarea"], ["sponsorPhone", "Sponsor’s phone", "tel"], ["sponsorEmail", "Sponsor’s email", "email"], ["agreement", "Written sponsorship agreement status", "text"], ["determination", "Current IRS determination letter status", "text"], ["duration", "How long will the sponsorship last?", "text"], ["fiscalSponsor", "Will the sponsor also handle donations?", "text"], ["fee", "Fiscal sponsorship percentage or admin fee", "text"], ["release", "How and when will funds be released to the pantry?", "textarea"],
  ] },
  { title: "Anything else?", description: "Questions, missing details, or anything you want Brandon to know.", fields: [["notes", "Notes or questions", "textarea"]] },
] as const;

export const foodOptions = ["Shelf-stable foods", "Produce", "Dairy", "Meat", "Frozen foods", "Prepared meals", "Baked goods"];

export function parseNonprofit(data: FormData) {
  const values: Record<string, string> = {};
  for (const section of sections) for (const [key] of section.fields) {
    const value = data.get(key);
    if (value !== null && typeof value !== "string") throw new Error("Please enter text in the form fields.");
    values[key] = (value ?? "").trim();
    if (values[key].length > 600) throw new Error("Please keep each answer under 600 characters.");
  }
  const foods = data.getAll("foods");
  if (foods.some(food => typeof food !== "string" || !foodOptions.includes(food))) throw new Error("Choose a listed food type.");
  const message = ["Our-Town Pantry — nonprofit planning intake", ...sections.flatMap(section => [section.title, ...section.fields.map(([key, label]) => `${label}: ${values[key] || "Not provided"}`)]), `Food types: ${foods.join(", ") || "Not provided"}`].join("\n\n");
  return { values, message };
}
