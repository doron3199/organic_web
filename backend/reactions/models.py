from dataclasses import dataclass, field
from typing import List, Optional, Union, Dict, Set


@dataclass
class ReactionSelectivity:
    """Ordered list of SMARTS patterns for relative ranking.

    The engine compares sibling product branches: those matching
    the highest-priority (lowest-index) pattern are labelled
    ``"major"``; the rest are ``"minor"``.
    """

    rules: List[str]


@dataclass
class StereoRule:
    """Stereochemistry directive embedded in a reaction rule."""

    type: str  # 'syn_addition' | 'anti_addition' | 'sn2_inversion' | 'sn1_racemization'
    pattern: Optional[str] = (
        None  # Optional SMARTS pattern override for stereo matching
    )
    description: Optional[str] = None  # Human-readable explanation


@dataclass
class SmartsEntry:
    """
    Rich SMARTS step entry.  Replaces a plain string in reaction_smarts
    lists when additional metadata is needed for a particular step.
    """

    smarts: str
    selectivity: Optional[ReactionSelectivity] = None
    explanation: Optional[str] = None


# Type alias used throughout the codebase
SmartsStep = Union[str, SmartsEntry]


@dataclass
class ReactionRule:
    id: str
    name: str
    curriculum_subsubject_id: str
    reaction_smarts: Union[str, List[SmartsStep]]
    reactants_smarts: List[str]
    description: str
    match_explanation: str = ""
    conditions: List[Set[str]] = field(default_factory=list)
    auto_add: Optional[List[Union[str, Dict]]] = None
    rank: int = 1
    append_reaction: Optional[str] = None
    block: bool = False
    stereo_rules: Optional[List[StereoRule]] = None
    chain_block: List[str] = field(default_factory=list)
