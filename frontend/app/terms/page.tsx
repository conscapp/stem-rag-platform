import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { COMPANY_LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use | conscRAG",
  description: "Terms governing use of conscRAG and submission of innovations to The consc company.",
};

const sections = [
  {
    title: "1. Agreement",
    paragraphs: [
      `These Terms of Use ("Terms") govern your access to ${COMPANY_LEGAL.product} operated by ${COMPANY_LEGAL.name} at ${COMPANY_LEGAL.site}. By using the platform or submitting content, you agree to these Terms and our Privacy Policy.`,
    ],
  },
  {
    title: "2. The service",
    paragraphs: [
      "conscRAG provides AI-assisted deep-tech innovation analysis across aerospace, nanotechnology, and nuclear fusion domains.",
      "The service retrieves evidence from a knowledge base, runs automated review agents, and may produce feasibility-oriented reports. Submission to our sponsorship review queue does not guarantee publication, sponsorship, or funding.",
    ],
  },
  {
    title: "3. Not professional advice",
    paragraphs: [
      "All outputs are for informational purposes only. conscRAG does not provide engineering, safety, legal, regulatory, or investment advice.",
      "AI-generated content may be incomplete, incorrect, or outdated. Verdicts such as Pass, Fail, or Incomplete are automated assessments only — not certifications, approvals, or guarantees of feasibility.",
      "You are solely responsible for decisions you make based on platform outputs.",
    ],
  },
  {
    title: "4. Eligibility",
    paragraphs: [
      "You must be at least 16 years old to use conscRAG. You represent that information you provide is accurate to the best of your knowledge.",
    ],
  },
  {
    title: "5. Acceptable use",
    paragraphs: ["You agree not to:"],
    list: [
      "Submit unlawful, infringing, harassing, or malicious content",
      "Attempt to bypass rate limits, scrape the service, or disrupt infrastructure",
      "Misrepresent AI outputs as human peer review or regulatory approval",
      "Use the service to develop weapons or illegal applications where prohibited by law",
      "Submit content you do not have the right to share",
    ],
  },
  {
    title: "6. Your submissions",
    paragraphs: [
      "When you submit an innovation for review, you represent that you own or have sufficient rights to the content you provide.",
      "You grant The consc company a non-exclusive, worldwide, royalty-free license to store, process, reproduce, and display your submission for moderation, analysis, and — if approved — publication in our public portfolio.",
      "If you consent to publication, approved submissions may be displayed with your contributor name and associated metadata.",
      "You retain ownership of your underlying ideas, subject to the license above.",
    ],
  },
  {
    title: "7. Moderation & sponsorship",
    paragraphs: [
      "We may approve, reject, edit metadata for, or remove submissions at our sole discretion. Sponsorship language on the site describes our intent, not a binding offer.",
      "Rejected submissions may be retained internally for abuse prevention and audit purposes as described in our Privacy Policy.",
    ],
  },
  {
    title: "8. Intellectual property",
    paragraphs: [
      "The conscRAG platform, branding, and site design are owned by The consc company. Open-source components may be available under separate licenses as indicated in our repository.",
      "You may not copy, reverse engineer, or resell the service without our written permission.",
    ],
  },
  {
    title: "9. Third-party services & donations",
    paragraphs: [
      "The platform relies on third-party providers (including AI, database, and hosting vendors). Donations may be processed by external platforms such as Open Collective or GitHub Sponsors, which have their own terms.",
    ],
  },
  {
    title: "10. Disclaimer of warranties",
    paragraphs: [
      'conscRAG is provided "as is" and "as available" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement.',
    ],
  },
  {
    title: "11. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by applicable law, The consc company shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill, arising from your use of the platform or reliance on AI outputs.",
      "Our total liability for any claim relating to the service shall not exceed the greater of CAD $100 or the amount you paid us in the twelve months preceding the claim (typically zero for free use).",
    ],
  },
  {
    title: "12. Indemnity",
    paragraphs: [
      "You agree to indemnify and hold harmless The consc company from claims arising out of your submissions, your use of the service, or your violation of these Terms or third-party rights.",
    ],
  },
  {
    title: "13. Copyright complaints",
    paragraphs: [
      `If you believe content on our portfolio infringes your copyright, email ${COMPANY_LEGAL.contactEmail} with: identification of the work, the URL or title of the material, your contact information, a good-faith statement, and your signature (physical or electronic).`,
      "We may remove or disable access to disputed content while we investigate.",
    ],
  },
  {
    title: "14. Governing law",
    paragraphs: [
      "These Terms are governed by the laws of Canada and the province in which The consc company is registered, without regard to conflict-of-law principles.",
    ],
  },
  {
    title: "15. Changes & termination",
    paragraphs: [
      "We may update these Terms or suspend access for violations or maintenance. Material changes will be reflected by updating the effective date. Continued use constitutes acceptance.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      subtitle={`${COMPANY_LEGAL.name} · ${COMPANY_LEGAL.product}`}
      sections={sections}
    />
  );
}
