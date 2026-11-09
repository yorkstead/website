import { brand } from "@/lib/brand";
import { publicBusinessDetails } from "@/lib/local-business";

export const founderExperience = [
  "Manufacturing and production management",
  "CNC operation and digital fabrication",
  "Exterior architectural panel production",
  "Inventory, shipping, packaging, and shop-floor workflows",
  "Operational metrics and process improvement",
  "Custom software, web applications, and automation",
  "Translating real production problems into usable systems",
] as const;

export const founder = {
  name: brand.founder,
  role: "Founder & Systems Architect",
  shortIntroduction: "Brandon York works across production, fabrication, operations, and software. That combination keeps every system grounded in the way quotes, material, people, paperwork, and finished work actually move.",
  portrait: {
    publicPath: "/media/founder/brandon-york.jpg",
    sourceWidth: 853,
    sourceHeight: 1280,
    aspectRatio: "4:5",
    alt: `${brand.founder}, founder of ${brand.name}`,
  },
} as const;

export const organizationId = `${brand.siteURL}/#organization`;
export const personPageUrl = `${brand.siteURL}/brandon-york`;
export const personId = `${personPageUrl}#person`;
export const profilePageId = `${personPageUrl}#profilepage`;

export const personStructuredData = {
  "@type": "Person",
  "@id": personId,
  name: founder.name,
  url: personPageUrl,
  image: `${brand.siteURL}${founder.portrait.publicPath}`,
  jobTitle: founder.role,
  description: founder.shortIntroduction,
  knowsAbout: [...founderExperience, "Warehousing and freight logistics", "Restaurant and service operations", "Business systems integration"],
  worksFor: { "@id": organizationId },
} as const;

export const organizationEntity = {
  "@type": "Organization",
  "@id": organizationId,
  name: brand.name,
  url: brand.siteURL,
  email: brand.email,
  description: brand.positioning,
  founder: { "@id": personId },
  ...(publicBusinessDetails.phone ? { telephone: publicBusinessDetails.phone } : {}),
  ...(publicBusinessDetails.serviceArea ? { areaServed: publicBusinessDetails.serviceArea } : {}),
  ...(publicBusinessDetails.address ? { address: publicBusinessDetails.address } : {}),
} as const;

// Keep the original export for existing consumers and tests. Each node has one stable @id.
export const founderStructuredData = {
  "@context": "https://schema.org",
  "@graph": [personStructuredData, organizationEntity],
} as const;

export const organizationStructuredData = {
  "@context": "https://schema.org",
  ...organizationEntity,
} as const;

export const founderProfileStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": profilePageId,
      url: personPageUrl,
      name: `${founder.name} | ${founder.role}`,
      mainEntity: { "@id": personId },
    },
    personStructuredData,
    organizationEntity,
  ],
} as const;
