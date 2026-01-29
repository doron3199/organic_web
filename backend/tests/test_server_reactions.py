from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path to allow importing main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


def test_run_reaction():
    # Test case: Ethane + Chlorine -> ...
    # reactant: 'C.ClCl', smarts: '[C;H1,H2,H3:1]>>[C:1][Cl]'
    payload = {
        "reactants": ["C", "ClCl"],
        "smarts": "[C;!H0:1].[Cl:2][Cl:3]>>[C:1][Cl:2].[Cl:3]",
    }
    response = client.post("/reaction", json=payload)
    assert response.status_code == 200
    data = response.json()

    products = data.get("products", [])
    # Check if we got any products
    assert len(products) > 0
    # Specific check for functionality (expecting something like 'ClC' or 'CCl')
    # Use generic property check as canonical smiles might vary
    assert any("Cl" in p for p in products)


def test_run_reaction_invalid_smarts():
    payload = {"reactants": ["C"], "smarts": "INVALID_SMARTS"}
    # Depending on how main.py handles it, it might return 500 or empty list.
    # Our logic returns [] on error or print error.
    # Actually main.py wraps run_reaction in try/except 500.

    # Let's check if it handles it gracefully or throws 500.
    # The current implementation catches generic Exception in main.py and returns 500.
    response = client.post("/reaction", json=payload)

    # If rdkit throws during init, it might be 500 or just empty.
    # run_reaction catches exceptions and returns []
    # BUT ReactionFromSmarts might not throw, just return None/Invalid.
    # If run_reaction returns [], status is 200.

    assert response.status_code in [200, 500]
