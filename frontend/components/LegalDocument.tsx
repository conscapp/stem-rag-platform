import Link from "next/link";
import { COMPANY_LEGAL, LEGAL_VERSION } from "@/lib/legal";

interface LegalSection {
  title: string;
  paragraphs: string[];
  list?: string[];
}

interface LegalDocumentProps {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

export default function LegalDocument({ title, subtitle, sections }: LegalDocumentProps) {
  return (
    <div className="page-container legal-page">
      <p className="platform-eyebrow">Legal</p>
      <h1 className="platform-title legal-title">{title}</h1>
      <p className="legal-meta">
        {subtitle} · Effective {LEGAL_VERSION} ·{" "}
        <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
      </p>

      <div className="legal-body">
        {sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {section.list && (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="legal-footer-note">
        This document is provided for transparency. It is not legal advice. For privacy requests,
        contact{" "}
        <a href={`mailto:${COMPANY_LEGAL.contactEmail}`}>{COMPANY_LEGAL.contactEmail}</a>.
      </p>
    </div>
  );
}
