"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MENU_LINKS = [
  { href: "/create", label: "Innovate" },
  { href: "/feed", label: "Portfolio" },
  { href: "/about", label: "Company" },
  { href: "/founder", label: "Founder" },
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <div className="header-inner">
        <Link href="/" className="logo" aria-label="The Consc Company home">
          <Image
            src="/logo.png"
            alt="The Consc Company"
            width={312}
            height={269}
            className="logo-image"
            priority
          />
          <span className="header-product">conscRAG</span>
        </Link>

        <div className="header-actions">
          <Link href="/create" className="btn btn-primary header-cta">
            Generate your idea
          </Link>

          <div className={`nav-menu${menuOpen ? " is-open" : ""}`} ref={menuRef}>
            <button
              type="button"
              className="nav-menu-toggle"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls="site-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="nav-menu-label">Menu</span>
              <span className="nav-menu-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>

            <div id="site-menu" className="nav-menu-panel" role="menu" hidden={!menuOpen}>
              {MENU_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
