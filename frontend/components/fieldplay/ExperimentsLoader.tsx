"use client";

import dynamic from "next/dynamic";

const ExperimentsApp = dynamic(() => import("./ExperimentsApp"), {
  ssr: false,
  loading: () => (
    <div className="fp-lane">
      <p className="fp-booting">Opening experiments…</p>
    </div>
  ),
});

export default function ExperimentsLoader() {
  return <ExperimentsApp />;
}
