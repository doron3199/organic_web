import pytest
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rdkit import Chem
from sync_reactions import sync
from reaction_logic import run_reaction

# Ensure backend can be imported if needed, usually pytest handles this but good to be safe
# Ensure backend can be imported


def canonical(smiles):
    if not smiles:
        return None
    # Handle multi-fragment SMILES
    frags = smiles.split(".")
    canonical_frags = []
    for f in frags:
        m = Chem.MolFromSmiles(f)
        if m:
            canonical_frags.append(Chem.MolToSmiles(m, isomericSmiles=True))
    return ".".join(sorted(canonical_frags))


def load_test_data():
    # Run sync to ensure data is fresh
    sync()

    # Look for json in backend/tests/ directory
    meta_path = os.path.join(os.path.dirname(__file__), "reaction_meta_tests.json")
    if not os.path.exists(meta_path):
        return [], {}

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data.get("examples", []), data.get("smarts", {})


# Load data at module level to use in parametrize
EXAMPLES, SMARTS_MAP = load_test_data()


@pytest.mark.parametrize("example", EXAMPLES)
def test_reaction_example(example):
    test_id = example["id"]
    reactants = example["reactants"]
    expected_products_raw = example["expected_products"]

    # Normalize expected products
    expected_fragments = {canonical(f) for f in expected_products_raw if canonical(f)}

    # Determine SMARTS
    rule_id = None
    current_smarts = None

    if test_id in SMARTS_MAP:
        rule_id = test_id
        current_smarts = SMARTS_MAP[test_id]
    else:
        # Longest prefix match
        matches = [rid for rid in SMARTS_MAP.keys() if test_id.startswith(rid)]
        if matches:
            rule_id = max(matches, key=len)
            current_smarts = SMARTS_MAP[rule_id]

    if not current_smarts:
        pytest.skip(f"No SMARTS found for test_id: {test_id}")

    # Run reaction
    result_dict = run_reaction(reactants, current_smarts)
    organic = result_dict["organic"]
    inorganic = result_dict["inorganic"]

    # Combine actual products
    all_actual = set()
    for s in organic + inorganic:
        for frag in s.split("."):
            c = canonical(frag)
            if c:
                all_actual.add(c)

    missing = expected_fragments - all_actual

    # Debug info on failure
    error_msg = (
        f"\nFailed: {test_id}"
        f"\nRule ID: {rule_id}"
        f"\nReactants: {reactants}"
        f"\nExpected: {expected_fragments}"
        f"\nActual:   {all_actual}"
        f"\nMissing:  {missing}"
    )

    assert not missing, error_msg
