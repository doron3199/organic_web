"""
Reaction engine core — exposes the main entry points.
"""

from engine.reaction_logic import run_reaction, run_chain_reaction
from engine.models import (
    ReactionStepInfo,
    ReactionBranch,
    ENGINE_RULES,
    MAX_CHAIN_STEPS,
    MAX_INITIAL_STEPS,
)
