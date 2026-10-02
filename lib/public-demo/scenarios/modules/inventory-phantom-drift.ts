// modules/demo/modules/inventory-phantom-drift.ts
import { ProblemDemoModule } from "../domain/demo-module-types";

export const inventoryPhantomDriftDemo: ProblemDemoModule = {
  id: "inv-phantom-drift",
  slug: "inventory-phantom-drift",
  category: "manufacturing",
  title: "Inventory Phantom & Cut-Yield Remnant Drift",
  industry: "Architectural Cladding & Sheet Fabrication",
  executiveSummary:
    "ERP records report available composite material in stock, but physical racks contain unlogged remnants, damaged sheets, or unrecorded scrap. Machines sit idle while operators search the shop floor for usable material.",
  annualScrapOrLossRisk: "$32,000 - $65,000 in machine downtime & rush freight fees",
  rootCause:
    "Static ERP balances do not track offcut yields or physical rack locations in real time, causing phantom inventory.",
  solutionBreakdown: [
    "Pre-setup scan-to-verify step at raw material staging racks",
    "Instant variance logging with automatic cycle-count recalculation",
    "Automated shortage flag dispatch to purchasing and scheduling before machine staging"
  ],
  initialState: {
    materialPartNumber: "ALU-4MM-FR-CHARCOAL",
    erpRecordedSheets: 14,
    physicalRackCount: 14,
    allocatedToActiveJob: 8,
    stagingStatus: "VERIFIED_READY",
    shortageFlagActive: false,
    activeAlert: null
  },
  walkthroughSteps: [
    {
      stepNumber: 1,
      title: "Pre-Flight Material Staging",
      stationOrRole: "Material Staging Rack B-04",
      actionDescription:
        "Staging operator scans rack location barcode B-04 for Job #24029 panels.",
      systemBehavior:
        "Queries live inventory ledger for part #ALU-4MM-FR-CHARCOAL and compares required yield (8 sheets) against available stock (14 sheets).",
      failurePrevented:
        "Ensures stock verification happens hours before CNC spindle time.",
      stateDelta: {
        stagingStatus: "VERIFYING_BIN"
      }
    },
    {
      stepNumber: 2,
      title: "Discrepancy Detection & Variance Trip",
      stationOrRole: "Mobile Scanner / Rack B-04",
      actionDescription:
        "Operator physically counts only 5 full sheets available; 9 were scrap remnants never updated in the ERP.",
      systemBehavior:
        "System trips an inventory variance trigger: Available physical (5) < Job Requirement (8).",
      failurePrevented:
        "Prevents staging an incomplete job that would halt mid-cycle on CNC Table 2.",
      stateDelta: {
        physicalRackCount: 5,
        shortageFlagActive: true,
        stagingStatus: "SHORTAGE_LOCKED",
        activeAlert:
          "INVENTORY VARIANCE: ERP reports 14 sheets, physically counted 5. Shortage of 3 sheets for Job #24029."
      }
    },
    {
      stepNumber: 3,
      title: "Automated Reconcile & PO Requisition",
      stationOrRole: "Purchasing & Shop Schedule HUD",
      actionDescription:
        "System reconciles rack B-04 count and sends an automated PO requisition draft to purchasing.",
      systemBehavior:
        "Updates stock balance to 5, reserves remnants in offcut pool, and swaps active job queue to unblock the CNC router.",
      failurePrevented:
        "Avoided machine teardown, operator downtime, and delayed freight delivery.",
      stateDelta: {
        erpRecordedSheets: 5,
        physicalRackCount: 5,
        shortageFlagActive: false,
        stagingStatus: "SCHEDULE_REALLOCATED",
        activeAlert:
          "RECONCILED: PO Draft #PO-8821 generated for 10 replacement sheets. Schedule queue swapped to Job #24028."
      }
    }
  ],
  triggers: [
    {
      id: "trigger-phantom-shortage",
      label: "Simulate Phantom Inventory Discovery",
      description:
        "Simulate operator scanning the rack and discovering missing raw sheets.",
      triggerType: "simulate_failure",
      resultingState: {
        physicalRackCount: 5,
        shortageFlagActive: true,
        stagingStatus: "SHORTAGE_LOCKED",
        activeAlert:
          "INVENTORY VARIANCE: Physical count (5) is less than Job Allocation (8). Machine locked."
      }
    },
    {
      id: "reconcile-and-reorder",
      label: "Apply Auto-Reconciliation & Reorder",
      description:
        "Adjust ledger to physical truth, log scrap, and create purchasing order.",
      triggerType: "apply_resolution",
      resultingState: {
        erpRecordedSheets: 5,
        physicalRackCount: 5,
        shortageFlagActive: false,
        stagingStatus: "SCHEDULE_REALLOCATED",
        activeAlert:
          "RESOLVED: Ledger adjusted to 5 sheets. Reorder PO drafted and job queue re-sequenced."
      }
    }
  ]
};
