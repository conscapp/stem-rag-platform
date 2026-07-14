"""Clean duplicate arXiv domain-subdir copies; report premium inventory."""
from pathlib import Path

root = Path(__file__).resolve().parents[2] / "data" / "premium"
academic = root / "academic"
flat = list(academic.glob("*.md"))
flat_names = {p.name for p in flat}
removed = 0
for d in academic.iterdir():
    if not d.is_dir():
        continue
    for p in d.glob("*.md"):
        if p.name in flat_names:
            p.unlink()
            removed += 1
            print(f"removed dup: {p.relative_to(root)}")

# move remaining domain files up to flat if unique
moved = 0
for d in list(academic.iterdir()):
    if not d.is_dir():
        continue
    for p in d.glob("*.md"):
        dest = academic / p.name
        if not dest.exists():
            p.rename(dest)
            moved += 1
            print(f"moved: {p.name}")
        else:
            p.unlink()
            removed += 1
    try:
        d.rmdir()
    except OSError:
        pass

print("---")
print("flat academic:", len(list(academic.glob("*.md"))))
print("ntrs:", len(list((root / "ntrs").rglob("*.md"))))
print("failed:", len(list((root / "failed_research").rglob("*.md"))))
print("patents:", len(list((root / "patents").rglob("*.md"))))
print("total premium md:", len(list(root.rglob("*.md"))))
print(f"removed={removed} moved={moved}")
