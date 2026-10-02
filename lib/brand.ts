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
  socialTitle: "Yorkstead Systems | Software you buy once. Software you own.",
  socialDescription: "Yorkstead Systems builds focused software around how your business actually operates and sells it as an asset you own, with no monthly fee to keep running.",
  emailFromName: "Brandon York | Yorkstead Systems",
  serviceSignals: ["Operations", "Workflows", "Inventory", "Scheduling", "Logistics"],
} as const;

export const brandMailto = `mailto:${brand.email}?subject=${encodeURIComponent("Project inquiry | Yorkstead Systems")}`;
