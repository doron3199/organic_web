import pytest
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rdkit import Chem
from sync_reactions import sync
from reaction_logic import run_reaction


# Tests to skip due to known reaction SMARTS issues
# (not test extraction issues - these need reaction definition fixes)
SKIP_TESTS = {
    # "alkene_halohydrin": "Expected products include competing halogenation pathway not modeled",
}


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


def add_extra_smarts(smarts_map):
    # Add alias for rearrangement reaction
    if "alkene_hydrohalogenation" in smarts_map:
        smarts_map["alkene_rearrangement_hx"] = smarts_map["alkene_hydrohalogenation"]
    return smarts_map


def load_test_data():
    # Run sync to ensure data is fresh
    sync()

    # Look for json in backend/tests/ directory
    meta_path = os.path.join(os.path.dirname(__file__), "reaction_meta_tests.json")
    if not os.path.exists(meta_path):
        return [], {}

    with open(meta_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data.get("examples", []), add_extra_smarts(data.get("smarts", {}))


# Load data at module level to use in parametrize
EXAMPLES, SMARTS_MAP = load_test_data()


@pytest.mark.parametrize("example", EXAMPLES)
def test_reaction_example(example):
    test_id = example["id"]

    # Check if this test should be skipped
    # Match by exact id or by prefix (for variants like alkene_hydration_something)
    for skip_id, reason in SKIP_TESTS.items():
        if test_id == skip_id or test_id.startswith(skip_id + "_"):
            pytest.skip(f"Known issue: {reason}")

    reactants = example["reactants"]
    expected_products_raw = example["expected_products"]

    # Get condition molecules to add to reactants
    condition_molecules = example.get("conditionMolecules", [])
    if condition_molecules:
        reactants = reactants + condition_molecules

    # Normalize expected products (without stereochemistry for comparison)
    expected_fragments = {
        canonical(f, include_stereo=False)
        for f in expected_products_raw
        if canonical(f, include_stereo=False)
    }

    # Determine SMARTS and autoAdd
    rule_id = None
    current_smarts = None
    auto_add = None

    if test_id in SMARTS_MAP:
        rule_id = test_id
        rule_data = SMARTS_MAP[test_id]
    else:
        # Longest prefix match
        matches = [rid for rid in SMARTS_MAP.keys() if test_id.startswith(rid)]
        if matches:
            rule_id = max(matches, key=len)
            rule_data = SMARTS_MAP[rule_id]
        else:
            rule_data = None

    # Handle both old format (string/array) and new format (object with reactionSmarts and autoAdd)
    if rule_data is not None:
        if isinstance(rule_data, dict):
            current_smarts = rule_data.get("reactionSmarts")
            auto_add = rule_data.get("autoAdd", [])
        else:
            # Legacy format: just the smarts string or array
            current_smarts = rule_data
            auto_add = []

    if not current_smarts:
        pytest.skip(f"No SMARTS found for test_id: {test_id}")

    # Run reaction with auto_add if available
    result_dict = run_reaction(
        reactants, current_smarts, auto_add=auto_add if auto_add else None
    )
    organic = result_dict["organic"]
    inorganic = result_dict["inorganic"]

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
        f"\nRule ID: {rule_id}"
        f"\nReactants: {reactants}"
        f"\nExpected: {expected_fragments}"
        f"\nActual:   {all_actual}"
        f"\nMissing:  {missing}"
    )

    assert not missing, error_msg
