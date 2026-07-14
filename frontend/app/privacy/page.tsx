import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { COMPANY_LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | conscRAG",
  description: "How The consc company collects, uses, and protects your data on conscRAG.",
};

const sections = [
  {
    title: "1. Who we are",
    paragraphs: [
      `${COMPANY_LEGAL.name} ("we", "us") operates ${COMPANY_LEGAL.product} at ${COMPANY_LEGAL.site}. We are based in ${COMPANY_LEGAL.country}.`,
      `Privacy questions: ${COMPANY_LEGAL.contactEmail}`,
    ],
  },
  {
    title: "2. What we collect",
    paragraphs: ["Depending on how you use the platform, we may collect:"],
    list: [
      "Innovation queries and analysis text you submit in the Innovation Lab",
      "Submission content: title, analysis report, innovation summary, contributor name, and cited sources",
      "IP address and request metadata for rate limiting and abuse prevention",
      "Basic usage and performance data via our hosting and analytics providers",
      "Operational logs (API endpoint, model name, token counts) for cost and reliability monitoring",
    ],
  },
  {
    title: "3. How we use your information",
    paragraphs: ["We use collected information to:"],
    list: [
      "Run multi-agent AI analysis on your queries",
      "Review, moderate, and optionally publish approved innovations in our public portfolio",
      "Prevent abuse and enforce rate limits",
      "Operate, secure, and improve the platform",
      "Comply with legal obligations",
    ],
  },
  {
    title: "4. AI processing & third parties",
    paragraphs: [
      "Your queries and submissions are processed by third-party service providers, including:",
      "DeepSeek (large language model inference), Qdrant Cloud (vector search), Supabase (database), and Vercel (hosting).",
      "If we enable basic analytics (e.g. Vercel Web Analytics), those providers may collect aggregated usage data such as page views and performance metrics.",
      "Data may be processed outside Canada, including in the United States. By using conscRAG, you acknowledge this cross-border processing.",
    ],
  },
  {
    title: "5. Public portfolio",
    paragraphs: [
      "If your innovation is approved, we may publish your title, contributor name, innovation summary, analysis content, and sources on our public portfolio at conscrag.com.",
      "You will be asked to consent to publication before submitting for sponsorship review.",
    ],
  },
  {
    title: "6. Retention",
    paragraphs: [
      "Query text sent for analysis is processed per request and is not stored as a permanent user profile in our application database.",
      "Pending and rejected submissions may be retained for moderation and audit purposes. Approved submissions remain published until removed under our Terms or upon valid takedown request.",
      "Server and analytics logs are retained for a limited period consistent with security and operations needs.",
    ],
  },
  {
    title: "7. Cookies & analytics",
    paragraphs: [
      "conscRAG uses minimal cookies. Our hosting provider may set essential cookies required for site delivery.",
      "If basic analytics are enabled, we use privacy-oriented analytics to understand traffic and performance. You can limit tracking through your browser settings.",
      "Admin review tools may use browser session storage locally on your device; this is not used for general visitors.",
    ],
  },
  {
    title: "8. Your rights (Canada / PIPEDA)",
    paragraphs: [
      "You may request access to, correction of, or deletion of personal information we hold about you, subject to legal exceptions.",
      `To make a request, email ${COMPANY_LEGAL.contactEmail} with enough detail for us to identify your submission. If you submitted as "anonymous" without contact information, we may be unable to verify or fulfill certain requests.`,
      "If you are in Quebec, additional privacy rights may apply under provincial law.",
    ],
  },
  {
    title: "9. Children",
    paragraphs: [
      "conscRAG is not directed at children under 16. We do not knowingly collect personal information from children.",
    ],
  },
  {
    title: "10. Security",
    paragraphs: [
      "We use industry-standard measures including HTTPS, access controls, and third-party infrastructure security. No method of transmission or storage is 100% secure.",
    ],
  },
  {
    title: "11. Changes",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The effective date at the top of this page will change when we do. Continued use after changes constitutes acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      subtitle={`${COMPANY_LEGAL.name} · ${COMPANY_LEGAL.product}`}
      sections={sections}
    />
  );
}
