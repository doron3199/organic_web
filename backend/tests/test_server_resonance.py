from fastapi.testclient import TestClient
import pytest
import sys
import os

# Add parent directory to path to allow importing main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

responses = {
    "O=[N+]([O-])C1=CC=CC=C1": {
        "O=[N+]([O-])C1=CC=CC=C1",
        "[O-][N+]([O-])=C1C=CC=C[CH+]1",
        "[O-][N+]([O-])=C1C=C[CH+]C=C1",
    },
    "O=C[O-]": {
        "O=C[O-]",
    },
    "C[CH+]/C=C/C": {
        "C/C=C/[CH+]C",
        "CC=C[CH+]C",
    },
}


def _extract_smiles_set(data):
    return {s.get("smiles") for s in data.get("structures", []) if s.get("smiles")}


def _post_resonance(smiles: str):
    payload = {
        "smiles": smiles,
        "allow_incomplete_octets": False,
        "allow_charge_separation": False,
        "unconstrained_cations": False,
        "unconstrained_anions": False,
    }
    return client.post("/resonance", json=payload)




def test_resonance_defaults_to_kekule_all_only():
    payload = {"smiles": "CC(=O)[O-]"}
    response = client.post("/resonance", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["input_smiles"] == payload["smiles"]
    assert isinstance(data.get("structures"), list)
    assert data["count"] >= 1


def test_resonance_kekule_only_with_all_optional_flags_false():
    payload = {
        "smiles": "CC(=O)[O-]",
        "allow_incomplete_octets": False,
        "allow_charge_separation": False,
        "unconstrained_cations": False,
        "unconstrained_anions": False,
    }
    response = client.post("/resonance", json=payload)

    assert response.status_code == 200
    data = response.json()

    assert data["input_smiles"] == payload["smiles"]
    assert isinstance(data.get("structures"), list)
    assert data["count"] >= 1


def test_resonance_invalid_smiles_returns_400():
    response = client.post("/resonance", json={"smiles": ""})
    assert response.status_code == 400


@pytest.mark.parametrize("input_smiles, expected_smiles", list(responses.items()))
def test_resonance_matches_expected_structure_set(input_smiles, expected_smiles):
    response = _post_resonance(input_smiles)

    assert response.status_code == 200
    data = response.json()
    received_smiles = _extract_smiles_set(data)

    assert received_smiles == expected_smiles, (
        f"Input: {input_smiles}\n"
        f"Expected: {sorted(expected_smiles)}\n"
        f"Received: {sorted(received_smiles)}"
    )
