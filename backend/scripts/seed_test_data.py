"""Seed test data with fundamental STEM principles for smoke testing."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "stem_vectors")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")

RAW_SCIENCE_DATA = [
    {
        "id": 1,
        "subject": "physics",
        "text": (
            "Newton's Second Law of Motion states that the acceleration of an object is "
            "dependent upon two variables: the net force acting upon the object and the mass "
            "of the object. The fundamental equation is expressed as $F = ma$, where $F$ is "
            "force in Newtons, $m$ is mass in kilograms, and $a$ is acceleration in meters per "
            "second squared."
        ),
    },
    {
        "id": 2,
        "subject": "chemistry",
        "text": (
            "The Ideal Gas Law is the equation of state of a hypothetical ideal gas. "
            "It is a good approximation of the behavior of many gases under many conditions. "
            "The chemical equation is $PV = nRT$, where $P$ is pressure, $V$ is volume, "
            "$n$ is the amount of substance in moles, $R$ is the ideal gas constant "
            "($8.314 \\, \\text{J mol}^{-1} \\text{K}^{-1}$), and $T$ is temperature in Kelvin."
        ),
    },
    {
        "id": 3,
        "subject": "math",
        "text": (
            "The fundamental theorem of calculus links the concept of differentiating a function "
            "with the concept of integrating a function. The core definitive integration formula "
            "is written as $\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)$, where $F$ is an "
            "antiderivative of $f$."
        ),
    },
    {
        "id": 4,
        "subject": "engineering",
        "text": (
            "Bernoulli's principle for incompressible, inviscid flow along a streamline states "
            "that $P + \\frac{1}{2}\\rho v^2 + \\rho g h = \\text{constant}$, where $P$ is "
            "pressure, $\\rho$ is fluid density, $v$ is flow velocity, $g$ is gravitational "
            "acceleration, and $h$ is elevation. This is fundamental to pipe flow and pump design."
        ),
    },
    {
        "id": 5,
        "subject": "physics",
        "text": (
            "Ohm's Law describes the relationship between voltage, current, and resistance in "
            "an electrical circuit: $V = IR$, where $V$ is voltage in volts, $I$ is current "
            "in amperes, and $R$ is resistance in ohms."
        ),
    },
]


def ensure_collection(client: QdrantClient, vector_size: int) -> None:
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        print(f"Created collection: {COLLECTION_NAME}")


def main() -> None:
    print("Loading embedding model...")
    encoder = SentenceTransformer(EMBEDDING_MODEL)
    vector_size = encoder.get_sentence_embedding_dimension()

    print(f"Connecting to Qdrant at {QDRANT_URL}...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    ensure_collection(client, vector_size)

    points = []
    for item in RAW_SCIENCE_DATA:
        vector = encoder.encode(item["text"]).tolist()
        points.append(
            PointStruct(
                id=item["id"],
                vector=vector,
                payload={
                    "subject": item["subject"],
                    "text": item["text"],
                    "source_file": "seed_test_data.py",
                    "chunk_index": 0,
                },
            )
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"Successfully seeded {len(points)} STEM data points into '{COLLECTION_NAME}'.")


if __name__ == "__main__":
    main()
