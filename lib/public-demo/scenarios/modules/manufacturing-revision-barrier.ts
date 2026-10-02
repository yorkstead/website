// modules/demo/modules/manufacturing-revision-barrier.ts
import { ProblemDemoModule } from "../domain/demo-module-types";

export const manufacturingRevisionBarrierDemo: ProblemDemoModule = {
  id: "mfg-rev-barrier",
  slug: "drawing-revision-barrier",
  category: "manufacturing",
  title: "CAD Revision Interlock & Scrap Prevention",
  industry: "Precision Fabrication & Cladding",
  executiveSummary:
    "Engineering issues cut bill revisions, but floor operators run physical paper packets from earlier releases. This creates unrecoverable scrap and emergency remake queues.",
  annualScrapOrLossRisk: "$45,000 - $120,000 in material scrap & remake labor",
  rootCause: "Physical paper shop travelers decouple from active digital release revisions.",
  solutionBreakdown: [
    "Scan-to-verify step at every CNC/routing machine setup",
    "Instant electronic lockout if traveler revision doesn't match active master hash",
    "Automated routing to supervisor triage queue without ruining stock material"
  ],
  initialState: {
    jobId: "JOB-24029",
    activeReleaseRev: "Rev_C",
    scannedTravelerRev: "Rev_C",
    machineStatus: "IDLE_READY",
    interlockActive: false,
    alertMessage: null
  },
  walkthroughSteps: [
    {
      stepNumber: 1,
      title: "Barcode Check-in",
      stationOrRole: "CNC Router Table 1",
      actionDescription: "Operator scans Traveler Barcode #TRV-24029-A.",
      systemBehavior: "Validates traveler revision against live engineering release database.",
      failurePrevented: "Halts cutting before any tool touches raw composite sheet.",
      stateDelta: { machineStatus: "VERIFYING_REVISION" }
    },
    {
      stepNumber: 2,
      title: "Interlock Triggered",
      stationOrRole: "CNC Station Terminal",
      actionDescription: "Outdated Rev_B traveler scanned when Rev_C is current.",
      systemBehavior: "Machine interlock activates with red visual warning banner.",
      failurePrevented: "Saved 4 architectural panels from improper edge routings.",
      stateDelta: {
        scannedTravelerRev: "Rev_B",
        machineStatus: "LOCKED_OUT",
        interlockActive: true,
        alertMessage: "LOCKOUT: Traveler Rev B is deprecated. Engineering released Rev C."
      }
    },
    {
      stepNumber: 3,
      title: "Digital Traveler Re-issue",
      stationOrRole: "Supervisor Station",
      actionDescription: "Supervisor approves digital update directly to operator terminal.",
      systemBehavior: "Replaces routing file on CNC controller with Rev_C nest.",
      failurePrevented: "Eliminated delay waiting for physical paper print reprints.",
      stateDelta: {
        scannedTravelerRev: "Rev_C",
        machineStatus: "READY_TO_RUN",
        interlockActive: false,
        alertMessage: null
      }
    }
  ],
  triggers: [
    {
      id: "scan-outdated",
      label: "Simulate Outdated Rev_B Scan",
      description: "Operator scans an old paper traveler while Rev_C is in production.",
      triggerType: "simulate_failure",
      resultingState: {
        scannedTravelerRev: "Rev_B",
        machineStatus: "LOCKED_OUT",
        interlockActive: true,
        alertMessage: "LOCKOUT: Traveler Rev B is deprecated. Engineering released Rev C."
      }
    },
    {
      id: "apply-override",
      label: "Push Digital Rev_C Update",
      description: "Supervisor pushes the verified digital release to clear the machine.",
      triggerType: "apply_resolution",
      resultingState: {
        scannedTravelerRev: "Rev_C",
        machineStatus: "READY_TO_RUN",
        interlockActive: false,
        alertMessage: null
      }
    }
  ]
};
