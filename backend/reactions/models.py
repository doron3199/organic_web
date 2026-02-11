from dataclasses import dataclass, field
from typing import List, Optional, Union, Dict, Set


@dataclass
class SelectivityRule:
    smarts: str
    label: str  # 'major', 'minor', 'trace', 'equal'


@dataclass
class ReactionSelectivity:
    type: str  # 'rank' | 'explicit'
    rules: List[SelectivityRule]


@dataclass
class ReactionRule:
    id: str
    name: str
    curriculum_subsubject_id: str
    reaction_smarts: Union[str, List[str]]
    reactants_smarts: List[str]
    description: str
    match_explanation: str = ""
    conditions: List[Set[str]] = field(default_factory=list)
    auto_add: Optional[List[Union[str, Dict]]] = None
    selectivity: Optional[ReactionSelectivity] = None
    rank: int = 1
    append_reaction: Optional[str] = None
