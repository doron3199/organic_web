from fastapi import HTTPException
from schemas import (
    ChiralityRequest,
    ProposeRequest,
    ReactionRequest,
    ResonanceRequest,
    SubstitutionRequest,
)

MAX_SMILES_LENGTH = 1000
MAX_SMARTS_LENGTH = 5000


def validate_smiles(smiles: str):
    """Checks if a SMILES string is within safe length limits."""
    if len(smiles) > MAX_SMILES_LENGTH:
        raise HTTPException(
            status_code=400, detail=f"SMILES string too long (max {MAX_SMILES_LENGTH})"
        )
    if not smiles.strip():
        raise HTTPException(status_code=400, detail="Empty SMILES string")


def validate_smarts(smarts: str):
    """Checks if a SMARTS string is within safe length limits."""
    if len(smarts) > MAX_SMARTS_LENGTH:
        raise HTTPException(
            status_code=400, detail=f"SMARTS string too long (max {MAX_SMARTS_LENGTH})"
        )
    if not smarts.strip():
        raise HTTPException(status_code=400, detail="Empty SMARTS string")


def check_reaction_security(data: ReactionRequest):
    """Security validation for the /reaction endpoint."""
    if not data.reactants:
        raise HTTPException(status_code=400, detail="At least one reactant is required")

    for r in data.reactants:
        validate_smiles(r)

    if isinstance(data.smarts, str):
        validate_smarts(data.smarts)
    else:
        for s in data.smarts:
            validate_smarts(s)


def check_substitution_security(data: SubstitutionRequest):
    """Security validation for the /reaction/substitution_elimination endpoint."""
    if not data.reactants:
        raise HTTPException(status_code=400, detail="At least one reactant is required")

    for r in data.reactants:
        validate_smiles(r)

    # Conditions are usually simple strings (e.g., 'heat', 'NaOH'),
    # but we should still bound them.
    for c in data.conditions:
        if len(c) > 200:
            raise HTTPException(status_code=400, detail="Condition string too long")


def check_propose_security(data: ProposeRequest):
    """Security validation for the /reactions/propose endpoint."""
    if not data.reactants:
        raise HTTPException(status_code=400, detail="At least one reactant is required")

    for r in data.reactants:
        validate_smiles(r)

    for c in data.conditions:
        if len(c) > 200:
            raise HTTPException(status_code=400, detail="Condition string too long")


def check_resonance_security(data: ResonanceRequest):
    """Security validation for the /resonance endpoint."""
    validate_smiles(data.smiles)


def check_chirality_security(data: ChiralityRequest):
    """Security validation for the /chirality endpoint."""
    validate_smiles(data.smiles)
