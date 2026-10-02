// modules/demo/modules/restaurant-inventory-interlock.ts
import { ProblemDemoModule } from "../domain/demo-module-types";

export const restaurantInventoryInterlockDemo: ProblemDemoModule = {
  id: "rest-86-sync",
  slug: "kitchen-86-pos-sync",
  category: "hospitality",
  title: "Kitchen Line 86 & Modifier Drift Prevention",
  industry: "Restaurant & High-Volume Hospitality",
  executiveSummary:
    "Kitchen lines run out of key ingredients mid-rush. Servers keep ringing up sold-out items on floor POS terminals, causing voided tickets, guest complaints, and high food comp costs.",
  annualScrapOrLossRisk: "$18,000 - $35,000 in comps, remakes, and lost table turns",
  rootCause: "Kitchen prep stations have no direct, real-time lock with server POS order terminals.",
  solutionBreakdown: [
    "One-tap station button on Kitchen Display System (KDS) to 86 an item or modifier",
    "Instant automatic gray-out on all floor POS tablets within 200ms",
    "Active suggestion of chef-selected substitute items at the moment of order entry"
  ],
  initialState: {
    targetItem: "Prime Rib Special",
    portionsRemaining: 3,
    posOrderingStatus: "AVAILABLE",
    activeAlert: null,
    kitchenNotes: "3 portions remaining in hot hold"
  },
  walkthroughSteps: [
    {
      stepNumber: 1,
      title: "Portion Depletion",
      stationOrRole: "Expediter Station (KDS)",
      actionDescription: "Line cooks plate the final portions of the Prime Rib.",
      systemBehavior: "Expo taps 'Depleted / 86' on the KDS item panel.",
      failurePrevented: "Prevents servers ringing in orders that cannot be fulfilled.",
      stateDelta: { portionsRemaining: 0, posOrderingStatus: "LOCKED_86" }
    },
    {
      stepNumber: 2,
      title: "POS Interlock & Re-route",
      stationOrRole: "Floor Server Tablet",
      actionDescription: "Server attempts to tap 'Prime Rib Special' for Table 14.",
      systemBehavior: "Item is disabled with a modal suggesting the 'Dry-Aged Ribeye' as substitution.",
      failurePrevented: "Avoids taking an order, having the kitchen reject it, and apologizing to guests 20 minutes later.",
      stateDelta: {
        activeAlert: "Item 86'd. Suggest dry-aged ribeye to guest.",
        posOrderingStatus: "SUBSTITUTION_PROMPTED"
      }
    }
  ],
  triggers: [
    {
      id: "deplete-inventory",
      label: "Trigger 86 from Kitchen KDS",
      description: "Kitchen flags that inventory has reached zero portions.",
      triggerType: "simulate_failure",
      resultingState: {
        portionsRemaining: 0,
        posOrderingStatus: "LOCKED_86",
        activeAlert: "Kitchen 86'd: Prime Rib Special. Replaced on floor terminals."
      }
    },
    {
      id: "restock-inventory",
      label: "Restock / Prep Next Batch",
      description: "Prep cook prepares fresh batch and unlocks POS ordering.",
      triggerType: "apply_resolution",
      resultingState: {
        portionsRemaining: 15,
        posOrderingStatus: "AVAILABLE",
        activeAlert: null
      }
    }
  ]
};
