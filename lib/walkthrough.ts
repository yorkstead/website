/** One step of a demo walkthrough: a screen captured from the running application, with a short explanation. */
export type WalkthroughStep = {
  id: string;
  device: "phone" | "desktop";
  who: string;
  label: string;
  title: string;
  body: string;
  detail?: string;
  image: { src: string; width: number; height: number; alt: string };
};
