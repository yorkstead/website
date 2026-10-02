export interface PublicDemoManifest {
  id: string;
  company: string;
  product: string;
  description: string;
  caseStudyUrl: string;
  storyLabel?: string;
  resetAfterMs: number;
}

export interface PublicDemoScenario {
  id: string;
  title: string;
  summary: string;
  why: string;
}
