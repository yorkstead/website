// modules/demo/demo-registry.ts
import { ProblemDemoModule } from "./domain/demo-module-types";
import { manufacturingRevisionBarrierDemo } from "./modules/manufacturing-revision-barrier";
import { restaurantInventoryInterlockDemo } from "./modules/restaurant-inventory-interlock";
import { inventoryPhantomDriftDemo } from "./modules/inventory-phantom-drift";

// Register all active demo modules here
const ALL_DEMO_MODULES: ProblemDemoModule[] = [
  manufacturingRevisionBarrierDemo,
  restaurantInventoryInterlockDemo,
  inventoryPhantomDriftDemo, // <--- Add your new module here
];

export function getAllDemoModules(): ProblemDemoModule[] {
  return ALL_DEMO_MODULES;
}

export function getDemoModuleBySlug(slug: string): ProblemDemoModule | undefined {
  return ALL_DEMO_MODULES.find((mod) => mod.slug === slug);
}

export function getDemoModulesByCategory(category: string): ProblemDemoModule[] {
  return ALL_DEMO_MODULES.filter((mod) => mod.category === category);
}
