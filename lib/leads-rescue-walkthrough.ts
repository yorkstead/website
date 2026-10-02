import type { WalkthroughStep } from "./walkthrough";

const base = "/media/leads-rescue/walkthrough";

export const leadsRescueWalkthroughSteps: WalkthroughStep[] = [
  {
    id: "01-idle",
    label: "Setup",
    device: "desktop",
    who: "Contractor",
    title: "The line is idle and ready",
    body: "The demo opens with a pretend roofing company, an idle phone line and an empty lead card. A button lets us simulate a homeowner calling while the crew is on a roof.",
    detail: "Everything on this screen is a simulation with invented names and numbers.",
    image: { src: `${base}/01-idle.webp`, width: 1440, height: 900, alt: "Demo screen with an idle phone line status, an empty lead card marked Waiting for Call, and a blank phone chat for a sample roofing company." },
  },
  {
    id: "02-rescue",
    label: "Text-back",
    device: "desktop",
    who: "Contractor",
    title: "A missed call gets an automatic text",
    body: "After the simulated missed call, the phone shows a text sent in the contractor's name asking what is wrong and what the address is. The lead card flips to Rescued / Engaged while the details are still pending.",
    detail: "The wording is a fixed script in the demo.",
    image: { src: `${base}/02-rescue.webp`, width: 1440, height: 900, alt: "Phone mockup showing an automatic text reply to a missed call, next to a lead card with status Rescued / Engaged and pending details." },
  },
  {
    id: "03-details",
    label: "Qualify",
    device: "desktop",
    who: "Homeowner",
    title: "The reply fills in the lead card",
    body: "We tap a suggested reply as the homeowner, reporting a ceiling leak and an address. The lead card shows the issue, the address and an emergency urgency flag, and the text thread offers two inspection times.",
    detail: "In the demo the fields are filled by the scripted reply, not by free-form understanding.",
    image: { src: `${base}/03-details.webp`, width: 1440, height: 900, alt: "Chat showing a homeowner reply about a ceiling leak and the lead card now listing issue, address and emergency urgency." },
  },
  {
    id: "04-booked",
    label: "Booking",
    device: "desktop",
    who: "Contractor",
    title: "A time is picked and the lead is booked",
    body: "Choosing the 10:00 AM slot confirms it in the chat and the lead card shows the appointment as booked. The contractor sees one card with the issue, address, urgency and slot.",
    detail: "Booking is simulated; nothing connects to a real calendar here.",
    image: { src: `${base}/04-booked.webp`, width: 1440, height: 900, alt: "Lead card with status Appointment Booked and confirmed slot Tomorrow at 10:00 AM beside the finished text conversation." },
  },
  {
    id: "05-phone",
    label: "Phone",
    device: "phone",
    who: "Homeowner",
    title: "The homeowner's side on a phone",
    body: "This is the same conversation as the homeowner would see it in a text thread on a narrow screen. It ends with the confirmed slot and a request for a photo of the damage.",
    detail: "The page itself stacks the lead card above the phone view on small screens.",
    image: { src: `${base}/05-phone.webp`, width: 780, height: 1482, alt: "Phone-width view of the text conversation ending with a booking confirmation message and a message input bar." },
  },
];
