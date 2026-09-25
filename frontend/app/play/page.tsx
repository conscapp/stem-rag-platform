import type { Metadata } from "next";
import FieldplayLoader from "@/components/fieldplay/FieldplayLoader";

export const metadata: Metadata = {
  title: "Fieldplay | conscRAG",
  description: "A strategy sandbox for research papers. Search OpenAlex, edit the graph, and play the outcome.",
};

export default function PlayPage() {
  return <FieldplayLoader />;
}
