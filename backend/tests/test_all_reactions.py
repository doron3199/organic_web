import pytest
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rdkit import Chem
from sync_reactions import sync
from reactions.rules import register_rules
from reaction_service import get_propose_results


def canonical(smiles, include_stereo=True):
    """Convert SMILES to canonical form for comparison."""
    if not smiles:
        return None
    # Handle multi-fragment SMILES
    frags = smiles.split(".")
    canonical_frags = []
    for f in frags:
        m = Chem.MolFromSmiles(f)
        if m:
            canonical_frags.append(Chem.MolToSmiles(m, isomericSmiles=include_stereo))
    return ".".join(sorted(canonical_frags))


def load_test_data():
    # Run sync to ensure data is fresh
    sync()
    register_rules()

    # Look for json in backend/tests/ directory
    meta_path = os.path.join(os.path.dirname(__file__), "reaction_meta_tests.json")
    if not os.path.exists(meta_path):
        return [], {}

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data.get("examples", [])


# Load data at module level to use in parametrize
EXAMPLES = load_test_data()


def example_display_id(example):
    if not isinstance(example, dict):
        return str(example)

    test_id = example.get("id", "unknown")
    reactants = example.get("reactants", [])
    reactants_text = " + ".join(reactants) if reactants else "no-reactants"

    # Keep VS Code Test Explorer entries readable
    if len(reactants_text) > 90:
        reactants_text = reactants_text[:87] + "..."

    return f"{test_id} :: {reactants_text}"


@pytest.mark.parametrize("example", EXAMPLES, ids=example_display_id)
def test_reaction_example(example):
    test_id = example.get("id")
    if not test_id:
        test_id = " + ".join(example.get("reactants", []))
        print(f"Test ID not found for example: {example}")

    reactants = example["reactants"]
    expected_products_raw = example["expected_products"]

    # Get condition molecules to add to reactants
    condition_molecules = example.get("conditionMolecules", [])
    if condition_molecules:
        reactants = reactants + condition_molecules

    # Get non-molecule conditions (heat, light, etc.)
    conditions = example.get("conditions", [])

    # Normalize expected products (without stereochemistry for comparison)
    expected_fragments = {
        canonical(f, include_stereo=False)
        for f in expected_products_raw
        if canonical(f, include_stereo=False)
    }

    # Run reaction with auto_add if available
    results = get_propose_results(reactants, conditions)

    organic = []
    inorganic = []

    for r in results:
        for p in r.get("products", []):
            if isinstance(p, dict) and "smiles" in p:
                organic.append(p["smiles"])
            elif isinstance(p, str):
                organic.append(p)
        inorganic.extend(r.get("byproducts", []))

    # Combine actual products (without stereochemistry for comparison)
    all_actual = set()
    for s in organic + inorganic:
        for frag in s.split("."):
            c = canonical(frag, include_stereo=False)
            if c:
                all_actual.add(c)

    missing = expected_fragments - all_actual

    # Debug info on failure
    error_msg = (
        f"\nFailed: {test_id}"
        # f"\nRule ID: {rule_id}"
        f"\nReactants: {reactants}"
        f"\nExpected: {expected_fragments}"
        f"\nActual:   {all_actual}"
        f"\nMissing:  {missing}"
    )

    assert not missing, error_msg
