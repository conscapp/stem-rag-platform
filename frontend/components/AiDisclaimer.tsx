export default function AiDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="ai-disclaimer ai-disclaimer-compact">
        We only report what our knowledge base contains. Missing data is not a judgment on your idea.
      </p>
    );
  }

  return (
    <aside className="ai-disclaimer" role="note">
      <p className="ai-disclaimer-title">How to read this</p>
      <p>
        conscRAG connects evidence across STEM to help you explore ideas. We never declare anything
        possible or impossible — if something stops here, it is because information is missing from
        our knowledge base, not because your intuition is wrong.
      </p>
    </aside>
  );
}
