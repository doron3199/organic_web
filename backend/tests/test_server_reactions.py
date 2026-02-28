from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path to allow importing main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set DEV environment for testing arbitrary SMARTS
os.environ["DEV"] = "1"

from main import app
from reactions.rules import register_rules

register_rules()

client = TestClient(app)


def test_run_reaction_arbitrary_smarts():
    """Test executing a custom SMARTS (requires DEV environment)."""
    payload = {
        "reactants": ["CC", "ClCl"],
        "smarts": "[C;!H0:1].[Cl:2][Cl:3]>>[C:1][Cl:2].[Cl:3]",
    }
    response = client.post("/reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    # Check if we got something with Cl in it (likely CCCl)
    assert data["products"] == ["CCCl"]
    assert data["byproducts"] == ["Cl"]


def test_run_reaction_with_id():
    """Test executing a reaction by its registered ID."""
    payload = {
        "reactants": ["C=C", "Cl"],
        "reactionId": "alkene_hydrohalogenation",
        "smarts": "C>>C",  # Must be non-empty to pass security.py, but will be ignored
    }
    response = client.post("/reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert len(data["products"]) > 0
    # Ethene + HCl -> Chloroethane
    assert data["products"] == ["CCCl"]
    assert data["byproducts"] == []


def test_propose_reactions():
    """Test the 'propose' endpoint which finds matching rules."""
    # Free Radical Chlorination: Alkane + Cl2 + Light
    payload = {"reactants": ["CC", "ClCl"], "conditions": ["light"]}
    response = client.post("/reactions/propose", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

    # Verify we found the chlorination rule
    assert data[0]["reactionId"] == "alkane_halogenation_cl"
    assert data[0]["reactionName"] == "Free Radical Chlorination"
    assert data[0]["products"] == [{"smiles": "CCCl", "selectivity": "major"}]
    assert data[0]["byproducts"] == ["Cl"]


def test_substitution_elimination():
    """Test the specialized substitution/elimination engine."""
    # 2-bromopropane + Hydroxide -> mixture of substitution and elimination
    payload = {"reactants": ["CC(Br)C", "[OH-]"], "conditions": ["heat"]}
    response = client.post("/reaction/substitution_elimination", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "products" in data
    assert len(data["products"]) > 0
    # Mechanisms should include E2 and potentially SN2
    assert set(data["products"]).issubset(set(["CC(C)O", "CC=C", "C=CC"]))
    assert set(data["inorganic"]).issubset(set(["[Br-]", "[H]O"]))
    assert set(data["mechanisms"]).issubset(set(["E2", "SN2"]))


def test_run_reaction_invalid_smarts():
    """Test handling of invalid SMARTS strings."""
    payload = {"reactants": ["C"], "smarts": "INVALID_SMARTS"}
    response = client.post("/reaction", json=payload)
    # The server should catch the error and return 500 (standard exception handling in main.py)
    assert response.status_code == 500


def test_security_constraints():
    """Test that security constraints (max length) are enforced."""
    # 1. SMARTS too long (caught by security.py)
    payload = {"reactants": ["C"], "smarts": "C" * 1000 + ">>C"}
    response = client.post("/reaction", json=payload)
    assert response.status_code == 400
    assert "too long" in response.json()["detail"]

    # 2. Too many reactants (caught by Pydantic/schemas.py)
    payload = {"reactants": ["C"] * 15, "smarts": "C>>C"}
    response = client.post("/reaction", json=payload)
    assert response.status_code == 422


def test_unauthorized_arbitrary_smarts():
    """Test that arbitrary SMARTS are blocked outside of DEV mode."""
    # Temporarily unset DEV
    os.environ["DEV"] = ""
    try:
        payload = {
            "reactants": ["C"],
            "smarts": "C>>C",
            # No reactionId provided
        }
        response = client.post("/reaction", json=payload)
        assert response.status_code == 403
    finally:
        os.environ["DEV"] = "1"
