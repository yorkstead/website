export const brand = {
  name: "Yorkstead Systems",
  wordmark: "YORKSTEAD",
  domainSuffix: " SYSTEMS",
  siteURL: "https://yorkstead.com",
  email: "hello@yorkstead.com",
  founder: "Brandon York",
  descriptor: "Tailored business software and workflow systems",
  audienceLine: "Tailored business software for manufacturing, logistics, warehousing, restaurants, ecommerce, and owner-led operations.",
  positioning: "Tailored business software and workflow automation for manufacturing, logistics, warehousing, restaurants, ecommerce, and owner-led businesses. Own your system without mandatory subscriptions.",
  promise: "Software suited to your actual operation, clear control over your system and data, and more time to run your business.",
  socialTitle: "Yorkstead Systems | Your business. Your workflow. Your software.",
  socialDescription: "Yorkstead Systems builds software around how your business actually operates. Own your system, reduce dependence on recurring software subscriptions, and give your team tools that fit the work.",
  emailFromName: "Brandon York | Yorkstead Systems",
  serviceSignals: ["Operations", "Workflows", "Inventory", "Scheduling", "Logistics"],
} as const;

export const brandMailto = `mailto:${brand.email}?subject=${encodeURIComponent("Project inquiry | Yorkstead Systems")}`;
