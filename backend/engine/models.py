import uuid
import logging
from dataclasses import dataclass, field
from typing import Optional

from rdkit import Chem

# ============================================================================
# Configuration & Constants
# ============================================================================

logger = logging.getLogger(__name__)

# Engine-based reactions that don't use simple SMARTS
ENGINE_RULES = {
    "elimination_substitution",
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
    step_explanation: Optional[str] = None
    step_selectivity: Optional[str] = None  # 'major', 'minor', 'equal'
    is_on_major_path: bool = True

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
            "step_explanation": self.step_explanation,
            "step_selectivity": self.step_selectivity,
            "is_on_major_path": self.is_on_major_path,
        }


@dataclass
class ReactionBranch:
    """Represents a single pathway/branch in the reaction tree."""

    molecules: list[Chem.Mol]
    parent_step_id: Optional[str]
    branch_id: str = field(default_factory=lambda: f"branch_{str(uuid.uuid4())[:8]}")
    auto_add_step_id: Optional[str] = None
    rule_history: list[str] = field(default_factory=list)
    is_on_major_path: bool = True
    selectivity_label: Optional[str] = None  # 'major' | 'minor' | 'equal'

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
            is_on_major_path=self.is_on_major_path,
            selectivity_label=self.selectivity_label,
        )
