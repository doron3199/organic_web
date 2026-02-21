from rdkit import Chem

from reactions.matcher import find_matching_reactions
from reactions.models import SmartsEntry
from engine.models import ReactionStepInfo, ReactionBranch, ENGINE_RULES


# ============================================================================
# Helpers: SMARTS Normalization
# ============================================================================


def extract_step_explanations(raw_smarts) -> list[str | None]:
    """
    Build a parallel list of explanation strings (or ``None``) for each
    step in a ``reaction_smarts`` value.  Works with plain strings,
    a single ``SmartsEntry``, or a mixed list.
    """
    if isinstance(raw_smarts, str):
        return [None]
    if isinstance(raw_smarts, SmartsEntry):
        return [raw_smarts.explanation]
    result: list[str | None] = []
    for entry in raw_smarts:
        if isinstance(entry, SmartsEntry):
            result.append(entry.explanation)
        else:
            result.append(None)
    return result


def extract_step_selectivities(raw_smarts):
    """
    Build a parallel list of ``ReactionSelectivity`` objects (or ``None``)
    for each step in a ``reaction_smarts`` value.
    """
    if isinstance(raw_smarts, str):
        return [None]
    if isinstance(raw_smarts, SmartsEntry):
        return [raw_smarts.selectivity]
    result = []
    for entry in raw_smarts:
        if isinstance(entry, SmartsEntry):
            result.append(entry.selectivity)
        else:
            result.append(None)
    return result


def normalize_smarts_for_json(raw_smarts) -> str | list[str]:
    """
    Convert ``reaction_smarts`` (str, SmartsEntry, or mixed list) into
    a JSON-safe value — a plain string or a list of plain strings.
    """
    if isinstance(raw_smarts, str):
        return raw_smarts
    if isinstance(raw_smarts, SmartsEntry):
        return raw_smarts.smarts
    return [e.smarts if isinstance(e, SmartsEntry) else e for e in raw_smarts]


def normalize_smarts_steps(raw_smarts: list) -> list[str]:
    """
    Normalize a mixed list of plain SMARTS strings and ``SmartsEntry``
    objects into a flat list of SMARTS strings suitable for the engine.

    ``SmartsEntry.selectivity`` / ``explanation`` / ``stereo_rules`` are
    attached at the *rule* level and consumed by the reaction service;
    the engine only needs the raw SMARTS string for execution.
    """
    result: list[str] = []
    for entry in raw_smarts:
        if isinstance(entry, str):
            result.append(entry)
        elif isinstance(entry, SmartsEntry):
            result.append(entry.smarts)
        elif isinstance(entry, dict):
            # In case raw dicts are passed (e.g. from JSON or tests)
            result.append(entry["smarts"])
        else:
            raise TypeError(
                f"Unexpected type in reaction_smarts list: {type(entry)}"
            )
    return result


# ============================================================================
# Helpers: Logic & Execution
# ============================================================================


def separate_organic_inorganic(
    branches: list[ReactionBranch],
) -> tuple[set[str], set[str]]:
    """Separates products into organic/inorganic sets."""
    organic, inorganic = set(), set()
    for branch in branches:
        for mol in branch.molecules:
            if not mol:
                continue
            smi = Chem.MolToSmiles(mol, isomericSmiles=True)
            has_carbon = any(a.GetSymbol() == "C" for a in mol.GetAtoms())
            (organic if has_carbon else inorganic).add(smi)
    return organic, inorganic


def find_next_reaction_matches(
    branch: ReactionBranch,
    exclude_ids: list[str] = None,
    conditions: list[str] = None,
) -> list[tuple[str, dict]]:
    """Finds matching rules for the molecules in a branch."""
    exclude_ids = exclude_ids or []
    conditions = set(conditions or [])

    matches = find_matching_reactions(branch.get_smiles(), conditions)
    valid = []

    for rule in matches:
        if rule.id in exclude_ids:
            continue
        # Only allow SMARTS rules or specific Engine rules
        if not rule.reaction_smarts and rule.id not in ENGINE_RULES:
            continue

        valid.append(
            (
                rule.id,
                {
                    "reactionSmarts": rule.reaction_smarts,
                    "autoAdd": rule.auto_add or [],
                    "name": rule.name,
                },
            )
        )
    return valid


def _parse_auto_add_molecules(auto_add_entry: str | dict) -> list[Chem.Mol]:
    """Parses an auto-add entry into a list of RDKit molecules."""
    mols = []
    if isinstance(auto_add_entry, str) and auto_add_entry.strip():
        for smi in auto_add_entry.split("."):
            smi = smi.strip()
            if smi:
                mol = Chem.MolFromSmiles(smi)
                if mol:
                    mols.append(mol)
    return mols


def _apply_auto_add_step(
    branches: list[ReactionBranch],
    molecules: list[Chem.Mol],
    step_counter: int,
    all_steps: list[ReactionStepInfo],
) -> int:
    """Adds molecules to all branches and records an 'auto_add' step."""
    if not molecules:
        return step_counter

    smiles_list = [Chem.MolToSmiles(m, isomericSmiles=True) for m in molecules]
    step_id = f"step_{step_counter}_autoadd"

    all_steps.append(
        ReactionStepInfo(
            step_id=step_id,
            step_index=step_counter,
            smarts_used="(auto-added reagents)",
            input_smiles=[],
            products=smiles_list,
            parent_id=None,
            step_type="auto_add",
        )
    )

    # Update all branches
    for b in branches:
        b.molecules.extend(molecules)
        b.auto_add_step_id = step_id

    return step_counter + 1
