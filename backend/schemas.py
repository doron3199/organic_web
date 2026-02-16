from pydantic import BaseModel, Field
from typing import List, Optional, Union


class ReactionRequest(BaseModel):
    # Added Field constraints to prevent ReDoS/OOM attacks with giant strings
    reactants: List[str] = Field(..., max_length=10)
    smarts: Union[str, List[str]] = Field(..., max_length=5000)
    debug: bool = False
    autoAdd: List[Union[str, dict]] = []
    reactionName: Optional[str] = None


class SubstitutionRequest(BaseModel):
    reactants: List[str] = Field(..., max_length=5)
    conditions: List[str] = Field(..., max_length=10)


class ProposeRequest(BaseModel):
    reactants: List[str] = Field(..., max_length=10)
    conditions: List[str] = Field(..., max_length=10)


class ResonanceRequest(BaseModel):
    smiles: str = Field(..., max_length=500)
    allow_incomplete_octets: bool = False
    allow_charge_separation: bool = False
    unconstrained_cations: bool = False
    unconstrained_anions: bool = False


class ChiralityRequest(BaseModel):
    smiles: str = Field(..., max_length=500)
