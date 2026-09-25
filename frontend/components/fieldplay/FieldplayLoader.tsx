"use client";

import dynamic from "next/dynamic";

const FieldplayApp = dynamic(() => import("./FieldplayApp"), {
  ssr: false,
  loading: () => (
    <div className="fieldplay-root">
      <p className="fp-booting">Opening the board…</p>
    </div>
  ),
});

export default function FieldplayLoader() {
  return <FieldplayApp />;
}
