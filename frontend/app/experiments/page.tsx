import type { Metadata } from "next";
import ExperimentsLoader from "@/components/fieldplay/ExperimentsLoader";

export const metadata: Metadata = {
  title: "Experiments | Fieldplay",
  description: "Local Fieldplay slots for paper-graph trials. Instant fixtures, separate from saved boards.",
};

export default function ExperimentsPage() {
  return <ExperimentsLoader />;
}
