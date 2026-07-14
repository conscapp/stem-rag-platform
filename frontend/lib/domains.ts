export const DOMAIN_OPTIONS = [
  { value: "aerospace", label: "Aerospace" },
  { value: "nanotechnology", label: "Nanotechnology" },
  { value: "clean_energy", label: "Nuclear Fusion" },
] as const;

export const DOMAIN_LABELS: Record<string, string> = {
  aerospace: "Aerospace",
  nanotechnology: "Nanotechnology",
  clean_energy: "Nuclear Fusion",
  energy: "Nuclear Fusion",
};

export function formatDomain(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain.replace(/_/g, " ");
}

export const EXAMPLE_QUERIES: Record<string, string> = {
  aerospace: "Could a rocket work without carrying all its fuel from Earth?",
  nanotechnology: "What if we could see individual atoms doing chemistry in real time?",
  clean_energy: "Can we use a different hydrogen isotope besides deuterium for fusion?",
};

export const EXAMPLE_QUERIES_ALT: Record<string, string> = {
  clean_energy: "Is there any path to nuclear energy at room temperature?",
};
