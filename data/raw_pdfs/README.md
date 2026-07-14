# STEM Seed Data

First-principles knowledge organized by subject:

```
data/seed/
├── physics/     — Newton's laws, thermodynamics, electromagnetism, fluids
├── chemistry/   — equilibrium, kinetics, stoichiometry, thermochemistry
├── math/        — calculus, linear algebra, differential equations
└── engineering/ — materials, heat transfer, fluid systems
```

## Ingest into Qdrant

```bash
cd backend
python scripts/ingest_text.py --fresh
```

`--fresh` clears the old collection and reloads only STEM fundamentals.

## Add PDFs later

Place open-access textbooks in `data/raw_pdfs/{physics,chemistry,math,engineering}/` and run:

```bash
python scripts/ingest.py --resume
```
