"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="header-inner">
        <div className="brand-block">
          <Link href="/" className="logo">
            The consc company
          </Link>
        </div>
        <nav>
          <div className="nav-leading">
            <span className="product-badge">conscRAG</span>
            <Link href="/create">Innovate</Link>
          </div>
          <Link href="/feed">Portfolio</Link>
          <Link href="/about">Company</Link>
          <Link href="/admin/review" className="nav-ghost">
            Review
          </Link>
        </nav>
      </div>
    </header>
  );
}
