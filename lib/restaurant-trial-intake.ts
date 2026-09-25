import { isValidEmailAddress } from "@/lib/semantic-validation";

export const approximateSeatOptions = [
  "Under 50 seats",
  "50–100 seats",
  "101–200 seats",
  "200+ seats",
] as const;

export const posTerminalCountOptions = [
  "1–2 terminals",
  "3–4 terminals",
  "5–8 terminals",
  "9+ terminals",
] as const;

export const kitchenSetupOptions = [
  "Kitchen Display Screens (KDS)",
  "Impact / Thermal Ticket Printers",
  "Hybrid (KDS + Printers)",
  "Handwritten / Manual Tickets",
] as const;

export const preferredTimingOptions = [
  "Immediate (within 2 weeks)",
  "Within 30–60 days",
  "Next seasonal menu change / future planning",
] as const;

export type RestaurantTrialField =
  | "restaurantName"
  | "contactName"
  | "email"
  | "phone"
  | "cityState"
  | "approximateSeats"
  | "posTerminals"
  | "currentPos"
  | "kitchenSetup"
  | "hasPrivateDining"
  | "biggestPainPoint"
  | "preferredTiming"
  | "notes";

export type RestaurantTrialErrors = Partial<Record<RestaurantTrialField, string>>;

export type RestaurantTrialValues = {
  restaurantName: string;
  contactName: string;
  email: string;
  phone: string;
  cityState: string;
  approximateSeats: string;
  posTerminals: string;
  currentPos: string;
  kitchenSetup: string;
  hasPrivateDining: string;
  biggestPainPoint: string;
  preferredTiming: string;
  notes: string;
};

export type RestaurantTrialPayload = RestaurantTrialValues & { website: string };

export type RestaurantTrialIntake = {
  cityState: string;
  approximateSeats: string;
  posTerminals: string;
  currentPos: string;
  kitchenSetup: string;
  hasPrivateDining: string;
  biggestPainPoint: string;
  preferredTiming: string;
  notes: string;
};

export function restaurantTrialIntake(values: RestaurantTrialValues): RestaurantTrialIntake {
  return {
    cityState: values.cityState,
    approximateSeats: values.approximateSeats,
    posTerminals: values.posTerminals,
    currentPos: values.currentPos,
    kitchenSetup: values.kitchenSetup,
    hasPrivateDining: values.hasPrivateDining,
    biggestPainPoint: values.biggestPainPoint,
    preferredTiming: values.preferredTiming,
    notes: values.notes,
  };
}

function limited(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

export function restaurantTrialPayload(input: FormData | Record<string, unknown>): RestaurantTrialPayload {
  const read = (key: string) => (input instanceof FormData ? input.get(key) : input[key]);
  return {
    restaurantName: limited(read("restaurantName"), 150),
    contactName: limited(read("contactName"), 100),
    email: limited(read("email"), 181).toLowerCase(),
    phone: limited(read("phone"), 40),
    cityState: limited(read("cityState"), 100),
    approximateSeats: limited(read("approximateSeats"), 40),
    posTerminals: limited(read("posTerminals"), 40),
    currentPos: limited(read("currentPos"), 100),
    kitchenSetup: limited(read("kitchenSetup"), 100),
    hasPrivateDining: limited(read("hasPrivateDining"), 20),
    biggestPainPoint: limited(read("biggestPainPoint"), 2000),
    preferredTiming: limited(read("preferredTiming"), 80),
    notes: limited(read("notes"), 3000),
    website: limited(read("website"), 200),
  };
}

export function validateRestaurantTrial(values: RestaurantTrialValues): RestaurantTrialErrors {
  const errors: RestaurantTrialErrors = {};
  if (values.restaurantName.length < 2) {
    errors.restaurantName = "Enter your restaurant or hospitality group name.";
  }
  if (values.contactName.length < 2) {
    errors.contactName = "Tell us who we are speaking with.";
  }
  if (!isValidEmailAddress(values.email, 180)) {
    errors.email = "Enter a valid email address.";
  }
  if (values.phone && !/^[+()\-.\s\d]{7,40}$/.test(values.phone)) {
    errors.phone = "Enter a valid phone number or leave it blank.";
  }
  if (values.cityState.length < 2) {
    errors.cityState = "Enter the city and state where the restaurant operates.";
  }
  if (values.approximateSeats && !approximateSeatOptions.includes(values.approximateSeats as typeof approximateSeatOptions[number])) {
    errors.approximateSeats = "Select an approximate dining capacity.";
  }
  if (values.posTerminals && !posTerminalCountOptions.includes(values.posTerminals as typeof posTerminalCountOptions[number])) {
    errors.posTerminals = "Select your terminal count.";
  }
  if (values.kitchenSetup && !kitchenSetupOptions.includes(values.kitchenSetup as typeof kitchenSetupOptions[number])) {
    errors.kitchenSetup = "Select your kitchen display or printer setup.";
  }
  if (values.preferredTiming && !preferredTimingOptions.includes(values.preferredTiming as typeof preferredTimingOptions[number])) {
    errors.preferredTiming = "Select your preferred trial timeline.";
  }
  return errors;
}
