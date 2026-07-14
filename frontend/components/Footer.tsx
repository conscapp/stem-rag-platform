import Link from "next/link";
import AiDisclaimer from "@/components/AiDisclaimer";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-company">The consc company</p>
        <p className="footer-tagline">
          Building the infrastructure for real deep-tech innovation.
        </p>
        <AiDisclaimer compact />
        <div className="footer-links">
          <Link href="/create">Innovate</Link>
          <Link href="/feed">Portfolio</Link>
          <Link href="/about">Company</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://conscrag.com" target="_blank" rel="noopener noreferrer">
            conscrag.com
          </a>
        </div>
        <p className="footer-copy">
          Bootstrap + community-funded · MIT License · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
