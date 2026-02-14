import logging
from typing import List, Set
from rdkit import Chem
from .models import ReactionRule
from .registry import ReactionRegistry
from .conditions import CONDITION_MOLECULES

logger = logging.getLogger(__name__)


def check_subset_match(reactants: List[str], patterns: List[str]) -> bool:
    """
    Check if a list of reactant SMILES satisfies a list of SMARTS patterns.
    Each pattern must be matched by a distinct reactant.
    """
    if not patterns:
        return True

    # We use a recursive backtracking approach to assign reactants to patterns
    used = [False] * len(reactants)
    return _match_recursive(reactants, patterns, 0, used)


def _match_recursive(
    reactants: List[str], patterns: List[str], pattern_idx: int, used: List[bool]
) -> bool:
    if pattern_idx == len(patterns):
        return True

    pattern_smarts = patterns[pattern_idx]
    mol_pattern = Chem.MolFromSmarts(pattern_smarts)
    if not mol_pattern:
        return False  # Invalid SMARTS in rule

    for i, reactant_smi in enumerate(reactants):
        if not used[i]:
            mol = Chem.MolFromSmiles(reactant_smi)
            if mol and mol.HasSubstructMatch(mol_pattern):
                used[i] = True
                if _match_recursive(reactants, patterns, pattern_idx + 1, used):
                    return True
                used[i] = False

    return False


def find_matching_reactions(
    reactants: List[str], conditions: Set[str]
) -> List[ReactionRule]:
    registry = ReactionRegistry.get_instance()
    all_rules = registry.get_all()
    matches = []

    # Augment reactants with molecules from conditions
    augmented_reactants = reactants.copy()

    for cond in conditions:
        normalized_cond = cond.lower().strip()
        if normalized_cond in CONDITION_MOLECULES:
            smi = CONDITION_MOLECULES[normalized_cond]
            # Verify we don't duplicate if already present?
            # Actually duplication is fine/good (e.g. excess reagent)
            # But usually we just add it to the soup.
            augmented_reactants.append(smi)

    # Some conditions might map to multiple molecules?
    # Current Dict maps to single string. Logic handles single string.

    for rule in all_rules:
        # 1. Check conditions (Explicit set matching from rule definition)
        condition_match = False

        # Iterate over rule's allowed condition sets (OR logic)
        for req_cond_set in rule.conditions:
            if req_cond_set.issubset(conditions):
                condition_match = True
                break

        if not condition_match:
            continue

        # 2. Check reactants
        # Use augmented reactants
        # Note: rule.reactants_smarts might be length 3, reactants might be length 1.
        # augmented might be length 3.

        if len(rule.reactants_smarts) > len(augmented_reactants):
            logger.debug(
                f"Rule {rule.id} ({rule.name}) skipped: needs {len(rule.reactants_smarts)} reactants, have {len(augmented_reactants)}"
            )
            continue

        if check_subset_match(augmented_reactants, rule.reactants_smarts):
            logger.debug(f"Rule {rule.id} ({rule.name}) matched!")
            # Handle append_reaction logic immediately?
            # In TS, we returned a modified rule object. We can do similar.

            if rule.append_reaction:
                appended_rule = registry.get(rule.append_reaction)
                if appended_rule:
                    # Merge SMARTS
                    base_smarts = (
                        rule.reaction_smarts
                        if isinstance(rule.reaction_smarts, list)
                        else [rule.reaction_smarts]
                    )
                    append_smarts = (
                        appended_rule.reaction_smarts
                        if isinstance(appended_rule.reaction_smarts, list)
                        else [appended_rule.reaction_smarts]
                    )

                    # Create a transient rule copy with merged SMARTS
                    from dataclasses import replace

                    new_rule = replace(rule)
                    new_rule.reaction_smarts = base_smarts + append_smarts
                    new_rule.selectivity = (
                        appended_rule.selectivity
                    )  # Inherit selectivity?
                    matches.append(new_rule)
                else:
                    matches.append(rule)
            else:
                matches.append(rule)

    # If any matching rule has block=True, filter out non-blocking rules
    if any(rule.block for rule in matches):
        matches = [rule for rule in matches if rule.block]

    return matches
