import itertools
import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional

from rdkit import Chem
from rdkit.Chem import AllChem

from reactions.matcher import find_matching_reactions

# ============================================================================
# Configuration & Constants
# ============================================================================

logger = logging.getLogger(__name__)

# Engine-based reactions that don't use simple SMARTS
ENGINE_RULES = {
    "elimination_substitution",
    "intramolecular_substitution",
}

# Maximum iterations for chain reactions to prevent infinite loops
MAX_CHAIN_STEPS = 15
MAX_INITIAL_STEPS = 50


# ============================================================================
# Data Structures
# ============================================================================


@dataclass
class ReactionStepInfo:
    """Represents a single step in the reaction tree."""

    step_id: str
    step_index: int
    smarts_used: str
    input_smiles: list[str]
    products: list[str]
    parent_id: Optional[str]
    step_type: str  # 'initial' | 'reaction' | 'carbocation_intermediate' | 'auto_add'
    group_id: Optional[str] = None
    reaction_context: Optional[str] = None
    reaction_name: Optional[str] = None
    parent_ids: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        parents = (
            self.parent_ids
            if self.parent_ids
            else ([self.parent_id] if self.parent_id else [])
        )
        return {
            "step_id": self.step_id,
            "step_index": self.step_index,
            "smarts_used": self.smarts_used,
            "input_smiles": self.input_smiles,
            "products": self.products,
            "parent_id": self.parent_id,
            "parent_ids": parents,
            "step_type": self.step_type,
            "group_id": self.group_id,
            "reaction_context": self.reaction_context,
            "reaction_name": self.reaction_name,
        }


@dataclass
class ReactionBranch:
    """Represents a single pathway/branch in the reaction tree."""

    molecules: list[Chem.Mol]
    parent_step_id: Optional[str]
    branch_id: str = field(default_factory=lambda: f"branch_{str(uuid.uuid4())[:8]}")
    auto_add_step_id: Optional[str] = None
    rule_history: list[str] = field(default_factory=list)

    def get_smiles(self) -> list[str]:
        return [Chem.MolToSmiles(m, isomericSmiles=True) for m in self.molecules]

    def copy(
        self, new_molecules: list[Chem.Mol], new_parent_id: str
    ) -> "ReactionBranch":
        """Helper to create a new branch from this one."""
        return ReactionBranch(
            molecules=new_molecules,
            parent_step_id=new_parent_id,
            rule_history=list(self.rule_history),
        )


# ============================================================================
# Carbocation Chemistry
# ============================================================================


def get_carbocation_stability(mol: Chem.Mol) -> int:
    """Returns the degree (stability) of a carbocation center, or -1 if none."""
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            return atom.GetDegree()
    return -1


def get_all_rearrangements(mol: Chem.Mol) -> list[tuple[Chem.Mol, str]]:
    """Get all possible carbocation rearrangements (1,2-hydride/methyl shifts)."""
    rearrangements = []

    # Pre-compiled reactions for performance
    rxn_hydride = AllChem.ReactionFromSmarts("[C;!H0:1]-[C+1:2]>>[C+1:1]-[C+0:2]")
    rxn_methyl = AllChem.ReactionFromSmarts(
        "[C:1](-[CH3:3])-[C+1:2]>>[C+1:1]-[C+0:2](-[CH3:3])"
    )

    current_stability = get_carbocation_stability(mol)

    # Check for vinyl carbocation (C+ on double bond) - these don't typically rearrange
    is_vinyl = False
    for atom in mol.GetAtoms():
        if atom.GetFormalCharge() == 1 and atom.GetSymbol() == "C":
            if atom.GetHybridization() == Chem.HybridizationType.SP:
                is_vinyl = True
            else:
                for bond in atom.GetBonds():
                    if bond.GetBondType() == Chem.BondType.DOUBLE:
                        is_vinyl = True
            if is_vinyl:
                break

    if is_vinyl:
        return []

    for rxn, shift_type in [
        (rxn_hydride, "hydride_shift"),
        (rxn_methyl, "methyl_shift"),
    ]:
        try:
            prods = rxn.RunReactants((mol,))
            for prod_tuple in prods:
                p = prod_tuple[0]
                try:
                    Chem.SanitizeMol(p)
                    if get_carbocation_stability(p) > current_stability:
                        rearrangements.append((p, shift_type))
                except Exception:
                    continue
        except Exception:
            continue

    return rearrangements


# ============================================================================
# Special Reaction Handling (Ozonolysis)
# ============================================================================


def is_ozonolysis_smarts(smarts: str) -> bool:
    return "[O-][O+]=O" in smarts or "O=[O+][O-]" in smarts


def find_ring_double_bond(mol: Chem.Mol) -> tuple[int, int, int] | None:
    """Returns (bond_idx, begin_atom_idx, end_atom_idx) of a ring double bond."""
    if mol is None:
        return None
    for bond in mol.GetBonds():
        if bond.GetBondType() == Chem.BondType.DOUBLE and bond.IsInRing():
            begin = bond.GetBeginAtom()
            end = bond.GetEndAtom()
            if begin.GetSymbol() == "C" and end.GetSymbol() == "C":
                return (bond.GetIdx(), begin.GetIdx(), end.GetIdx())
    return None


def perform_ring_ozonolysis(mol: Chem.Mol) -> Chem.Mol | None:
    """Fragments a cyclic alkene at the double bond and caps with carbonyls."""
    ring_db = find_ring_double_bond(mol)
    if not ring_db:
        return None

    bond_idx, _, _ = ring_db
    try:
        # Fragment and get editable mol
        fragmented = Chem.FragmentOnBonds(mol, [bond_idx], dummyLabels=[(1, 2)])
        if not fragmented:
            return None

        editable = Chem.RWMol(fragmented)
        dummy_atoms = [a.GetIdx() for a in editable.GetAtoms() if a.GetAtomicNum() == 0]

        if len(dummy_atoms) != 2:
            return None

        # Replace dummies with Oxygen double bonds
        for dummy_idx in dummy_atoms:
            dummy_atom = editable.GetAtomWithIdx(dummy_idx)
            neighbors = list(dummy_atom.GetNeighbors())
            if len(neighbors) != 1:
                continue

            carbon_idx = neighbors[0].GetIdx()
            oxygen_idx = editable.AddAtom(Chem.Atom(8))
            editable.AddBond(carbon_idx, oxygen_idx, Chem.BondType.DOUBLE)

        # Remove dummies (reverse order to preserve indices)
        for dummy_idx in sorted(dummy_atoms, reverse=True):
            editable.RemoveAtom(dummy_idx)

        Chem.SanitizeMol(editable)
        return editable.GetMol()
    except Exception as e:
        logger.warning(f"Ring ozonolysis failed: {e}")
        return None


def handle_ring_ozonolysis_for_branch(
    branch: ReactionBranch, smarts: str
) -> tuple[list[Chem.Mol], list[int]] | None:
    """Detects and handles ring ozonolysis, returning products and reactant indices."""
    if not is_ozonolysis_smarts(smarts):
        return None

    alkene_idx, ozone_idx = None, None
    for i, mol in enumerate(branch.molecules):
        if not mol:
            continue
        smiles = Chem.MolToSmiles(mol)
        if "[O-][O+]=O" in smiles or "O=[O+][O-]" in smiles:
            ozone_idx = i
        elif find_ring_double_bond(mol):
            alkene_idx = i

    if alkene_idx is not None and ozone_idx is not None:
        product = perform_ring_ozonolysis(branch.molecules[alkene_idx])
        if product:
            return ([product], [alkene_idx, ozone_idx])

    return None


# ============================================================================
# Core Logic: Branch Processing
# ============================================================================


def sanitize_and_gather_products(products: tuple) -> list[dict]:
    """Sanitize mols and return dict with metadata."""
    info = []
    for p in products:
        try:
            p.UpdatePropertyCache()
            Chem.SanitizeMol(p)
            info.append(
                {
                    "mol": p,
                    "smiles": Chem.MolToSmiles(p, isomericSmiles=True),
                    "stability": get_carbocation_stability(p),
                }
            )
        except Exception:
            pass
    return info


def deduplicate_branches(branches: list[ReactionBranch]) -> list[ReactionBranch]:
    unique = []
    seen = set()
    for b in branches:
        sig = ".".join(sorted(b.get_smiles()))
        if sig not in seen:
            seen.add(sig)
            unique.append(b)
    return unique


def process_branch_reaction_outcome(
    branch: ReactionBranch,
    reactant_indices: tuple[int, ...],
    products: tuple,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
    reaction_context: str | None = None,
    reaction_name: str | None = None,
) -> tuple[list[ReactionBranch], int]:
    """
    Creates new branches from a reaction result.
    Handles product creation, spectator preservation, and carbocation rearrangements.
    """
    prod_info = sanitize_and_gather_products(products)
    if not prod_info:
        return [], step_counter

    # Identify reactants and spectators
    reactants = [branch.molecules[i] for i in reactant_indices]
    spectators = [
        m for i, m in enumerate(branch.molecules) if i not in reactant_indices
    ]
    spectator_smiles = [Chem.MolToSmiles(m, isomericSmiles=True) for m in spectators]

    # Create the reaction step
    is_carbocation = any(i["stability"] > 0 for i in prod_info)
    step_id = f"step_{step_counter}_rxn"
    group_id = f"grp_{str(uuid.uuid4())[:8]}"

    input_smiles = [Chem.MolToSmiles(r) for r in reactants]
    product_smiles = [i["smiles"] for i in prod_info] + spectator_smiles

    # Build parent IDs
    parents = []
    if branch.parent_step_id:
        parents.append(branch.parent_step_id)
    if branch.auto_add_step_id:
        parents.append(branch.auto_add_step_id)

    step_info = ReactionStepInfo(
        step_id=step_id,
        step_index=step_counter,
        smarts_used=smarts,
        input_smiles=input_smiles,
        products=product_smiles,
        parent_id=branch.parent_step_id,
        step_type="carbocation_intermediate" if is_carbocation else "reaction",
        group_id=group_id,
        parent_ids=parents,
        reaction_context=reaction_context,
        reaction_name=reaction_name,
    )
    all_steps.append(step_info)
    step_counter += 1

    new_branches = []

    # 1. Primary Product Branch
    product_mols = [i["mol"] for i in prod_info]
    main_branch = branch.copy(product_mols + spectators, step_id)
    new_branches.append(main_branch)

    # 2. Carbocation Rearrangements (creates additional parallel branches)
    if is_carbocation:
        for info in prod_info:
            if info["stability"] <= 0:
                continue

            rearrangements = get_all_rearrangements(info["mol"])
            other_products = [i for i in prod_info if i is not info]

            for rearr_mol, shift_type in rearrangements:
                rearr_step_id = f"step_{step_counter}_rearr"
                rearr_smiles = Chem.MolToSmiles(rearr_mol, isomericSmiles=True)

                # Gather all molecules for this outcome
                branch_mols = (
                    [rearr_mol] + [op["mol"] for op in other_products] + spectators
                )
                branch_smiles = (
                    [rearr_smiles]
                    + [op["smiles"] for op in other_products]
                    + spectator_smiles
                )

                all_steps.append(
                    ReactionStepInfo(
                        step_id=rearr_step_id,
                        step_index=step_counter,
                        smarts_used=f"({shift_type})",
                        input_smiles=[info["smiles"]],
                        products=branch_smiles,
                        parent_id=step_id,
                        step_type="carbocation_rearrangement",
                        group_id=group_id,
                        reaction_context=reaction_context,
                        reaction_name=reaction_name,
                    )
                )
                step_counter += 1

                new_branches.append(main_branch.copy(branch_mols, rearr_step_id))

    return new_branches, step_counter


def process_branch_with_smarts(
    branch: ReactionBranch,
    smarts: str,
    step_counter: int,
    all_steps: list[ReactionStepInfo],
    reaction_context: str | None = None,
    reaction_name: str | None = None,
) -> tuple[list[ReactionBranch], int]:
    """Apply a single SMARTS pattern to a branch."""

    # Check for Ring Ozonolysis special case
    ozonolysis = handle_ring_ozonolysis_for_branch(branch, smarts)
    if ozonolysis:
        mols, indices = ozonolysis
        return process_branch_reaction_outcome(
            branch,
            tuple(indices),
            tuple(mols),
            smarts + " (ring fragmentation)",
            step_counter,
            all_steps,
            reaction_context,
            reaction_name,
        )

    # Standard SMARTS processing
    rxn = AllChem.ReactionFromSmarts(smarts)
    num_templates = rxn.GetNumReactantTemplates()

    # Try all permutations of molecules
    indices = range(len(branch.molecules))
    combinations = list(itertools.permutations(indices, num_templates))

    new_branches = []
    seen_outcomes = set()

    for combo in combinations:
        reactants = tuple(branch.molecules[i] for i in combo)
        try:
            results = rxn.RunReactants(reactants)
            for product_tuple in results:
                # Deduplicate outcomes within this branch execution
                sig = ".".join(
                    sorted(
                        [
                            Chem.MolToSmiles(p, isomericSmiles=True)
                            for p in product_tuple
                        ]
                    )
                )
                if sig in seen_outcomes:
                    continue
                seen_outcomes.add(sig)

                b_list, step_counter = process_branch_reaction_outcome(
                    branch,
                    combo,
                    product_tuple,
                    smarts,
                    step_counter,
                    all_steps,
                    reaction_context,
                    reaction_name,
                )
                new_branches.extend(b_list)
        except Exception as e:
            logger.debug(f"Reaction execution failed: {e}")
            continue

    return new_branches, step_counter


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


# ============================================================================
# Main Orchestration
# ============================================================================


def run_chain_reaction(
    initial_branches: list[ReactionBranch],
    all_steps: list[ReactionStepInfo],
    step_counter: int,
    conditions: list[str] | None = None,
) -> tuple[list[ReactionBranch], int]:
    """
    Open World Mode: Iteratively finds and executes reactions on branches until stability.
    """
    current_branches = initial_branches

    for _ in range(MAX_CHAIN_STEPS):
        next_round_branches = []
        something_happened = False

        for branch in current_branches:
            # Find applicable rules
            matches = find_next_reaction_matches(
                branch, exclude_ids=branch.rule_history, conditions=conditions
            )

            if not matches:
                next_round_branches.append(branch)
                continue

            something_happened = True

            # Apply each matching rule (forking the universe)
            for rule_id, rule_data in matches:
                # Prepare SMARTS list
                smarts_list = rule_data.get("reactionSmarts") or []
                if isinstance(smarts_list, str):
                    smarts_list = [smarts_list]

                auto_adds = rule_data.get("autoAdd", [])
                rule_name = rule_data.get("name")

                # Active branches for this rule execution chain
                rule_branches = [branch]

                # Execute sequential steps of the rule (skip for engine rules)
                if rule_id not in ENGINE_RULES:
                    for i, smarts in enumerate(smarts_list):
                        # 1. Handle Auto Add
                        aa_mols = []
                        if i < len(auto_adds):
                            aa_mols = _parse_auto_add_molecules(auto_adds[i])

                        if aa_mols:
                            for b in rule_branches:
                                b.molecules.extend(aa_mols)

                        # 2. Execute SMARTS
                        next_step_branches = []
                        for b in rule_branches:
                            res_branches, step_counter = process_branch_with_smarts(
                                b,
                                smarts,
                                step_counter,
                                all_steps,
                                reaction_context=rule_id,
                                reaction_name=rule_name,
                            )
                            next_step_branches.extend(res_branches)

                        rule_branches = next_step_branches
                        if not rule_branches:
                            break

                # Update history (applies to both SMARTS and engine rules)
                for final_b in rule_branches:
                    final_b.rule_history = branch.rule_history + [rule_id]
                    next_round_branches.append(final_b)

        if something_happened:
            current_branches = deduplicate_branches(next_round_branches)
        else:
            break  # Stability reached

    return current_branches, step_counter


def run_reaction(
    reactants_smiles: list[str],
    reaction_smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
    reaction_context: str | None = None,
    conditions: list[str] | None = None,
    reaction_name: str | None = None,
) -> dict:
    """
    Main entry point. Runs a reaction (sequence) and returns products/steps.
    """
    # 1. Initialization
    initial_steps_queue = (
        [reaction_smarts] if isinstance(reaction_smarts, str) else reaction_smarts
    )
    auto_adds = auto_add or []

    # Create initial branch
    initial_mols = [Chem.MolFromSmiles(s) for s in reactants_smiles]
    initial_step_id = "step_0_reactants"

    all_steps = [
        ReactionStepInfo(
            step_id=initial_step_id,
            step_index=0,
            smarts_used="(initial reactants)",
            input_smiles=[],
            products=reactants_smiles,
            parent_id=None,
            step_type="initial",
        )
    ]

    current_branches = [
        ReactionBranch(molecules=initial_mols, parent_step_id=initial_step_id)
    ]
    step_counter = 1

    # 2. Process Initial Directed Steps
    ctx = reaction_context or "reaction"

    for i, smarts in enumerate(initial_steps_queue):
        if not current_branches:
            break

        # Auto-add
        if i < len(auto_adds):
            mols = _parse_auto_add_molecules(auto_adds[i])
            step_counter = _apply_auto_add_step(
                current_branches, mols, step_counter, all_steps
            )

        # Process SMARTS
        next_branches = []
        for branch in current_branches:
            branches, step_counter = process_branch_with_smarts(
                branch,
                smarts,
                step_counter,
                all_steps,
                reaction_context=ctx,
                reaction_name=reaction_name,
            )
            # Propagate history
            for nb in branches:
                nb.rule_history = list(branch.rule_history)
            next_branches.extend(branches)

        current_branches = deduplicate_branches(next_branches)

    # 3. Open World Chain Reaction
    if current_branches:
        current_branches, step_counter = run_chain_reaction(
            current_branches, all_steps, step_counter, conditions
        )

    # 4. Finalize Results
    organic, inorganic = separate_organic_inorganic(current_branches)

    if debug:
        return {
            "steps": [s.to_dict() for s in all_steps],
            "final_organic": list(organic),
            "final_inorganic": list(inorganic),
        }
    else:
        return {"organic": list(organic), "inorganic": list(inorganic)}
