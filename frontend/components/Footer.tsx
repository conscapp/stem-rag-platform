import Image from "next/image";
import Link from "next/link";
import AiDisclaimer from "@/components/AiDisclaimer";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image
            src="/logo.png"
            alt="The Consc Company"
            width={312}
            height={269}
            className="footer-logo"
          />
          <p className="footer-tagline">
            Open deep-tech exploration for curious innovators — free forever, built in public.
          </p>
        </div>
        <AiDisclaimer compact />
        <div className="footer-links">
          <Link href="/create">Innovate</Link>
          <Link href="/feed">Portfolio</Link>
          <Link href="/about">Company</Link>
          <Link href="/founder">Founder</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://conscrag.com">conscrag.com</a>
        </div>
        <p className="footer-copy">
          Bootstrap + community-funded · MIT License · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
