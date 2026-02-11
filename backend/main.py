import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Union
import uvicorn
from reaction_logic import run_reaction

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Security: Restrict allowed origins
# In production, set ALLOWED_ORIGINS env var to "https://yourdomain.com"
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173",
)
origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReactionRequest(BaseModel):
    # Added Field constraints to prevent ReDoS/OOM attacks with giant strings
    reactants: List[str] = Field(..., max_items=10)
    smarts: Union[str, List[str]] = Field(..., max_length=5000)
    debug: bool = False
    autoAdd: List[Union[str, dict]] = []


class ReactionResponse(BaseModel):
    products: List[str]
    byproducts: List[str]


@app.post("/reaction")
@limiter.limit("10/minute")
async def execute_reaction(request: Request, data: ReactionRequest):
    """
    Execute a reaction. Returns simple products if debug=False,
    or detailed step-by-step info if debug=True.
    """
    try:
        # Sanitize reactant strings
        if any(len(r) > 1000 for r in data.reactants):
            raise HTTPException(status_code=400, detail="Reactant SMILES too long")

        result = run_reaction(
            data.reactants,
            data.smarts,
            debug=data.debug,
            auto_add=data.autoAdd,
        )

        if data.debug:
            return result
        else:
            return {"products": result["organic"], "byproducts": result["inorganic"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReactionStepModel(BaseModel):
    step_id: str
    step_index: int
    smarts_used: str
    input_smiles: List[str]
    products: List[str]
    parent_id: Union[str, None]
    step_type: str
    group_id: Union[str, None] = None


class DebugReactionResponse(BaseModel):
    steps: List[ReactionStepModel]
    final_organic: List[str]
    final_inorganic: List[str]


@app.post("/reaction/debug", response_model=DebugReactionResponse)
@limiter.limit("10/minute")
async def execute_reaction_debug(request: Request, data: ReactionRequest):
    """Run a reaction and return all intermediate steps for debugging."""
    try:
        result = run_reaction(
            data.reactants, data.smarts, debug=True, auto_add=data.autoAdd
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SubstitutionRequest(BaseModel):
    reactants: List[str] = Field(..., max_items=5)
    conditions: List[str] = Field(..., max_items=10)


@app.post("/reaction/substitution_elimination")
@limiter.limit("10/minute")
async def execute_substitution_elimination(request: Request, data: SubstitutionRequest):
    try:
        from substitution_elimination import run_substitution_elimination

        result = run_substitution_elimination(data.reactants, data.conditions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ParseRequest(BaseModel):
    smiles: str = Field(..., max_length=1000)


@app.post("/parse")
@limiter.limit("10/minute")
async def parse_smiles(request: Request, data: ParseRequest):
    try:
        from rdkit import Chem

        mol = Chem.MolFromSmiles(data.smiles)
        if not mol:
            raise HTTPException(status_code=400, detail="Invalid SMILES")
        # Generate MolBlock
        mol_block = Chem.MolToMolBlock(mol)
        return {"molBlock": mol_block}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "ok"}


# --- New Reaction Propose Endpoint ---
from reactions.registry import ReactionRegistry
from reactions.rules import register_rules
from reactions.matcher import find_matching_reactions


@app.on_event("startup")
async def startup_event():
    # Initialize registry with rules
    register_rules()
    print("Reaction rules registered.")


class ProposeRequest(BaseModel):
    reactants: List[str]
    conditions: List[str]


@app.post("/reactions/propose")
async def propose_reactions(request: Request, data: ProposeRequest):
    """
    Propose reactions for a given set of reactants and conditions.
    """
    try:
        # 1. Match Rules
        matches = find_matching_reactions(data.reactants, set(data.conditions))

        results = []
        for rule in matches:
            # 2. Execute Reaction (for each match)
            # We use the existing run_reaction logic, but we need to supply the SMARTS.
            # If the rule has multiple steps (list of SMARTS), run_reaction handles it?
            # run_reaction expects `smarts` as str or list[str].

            # Prepare debug mode to get mechanism?
            # Let's say we always want mechanism info if available?
            # For "Propose", we just want the products and the match info.

            # Resolve auto_add from rule if present
            auto_add = rule.auto_add if rule.auto_add else []

            # Execute
            try:
                # Special handling for Substitution/Elimination
                if rule.id == "elimination_substitution":
                    from substitution_elimination import run_substitution_elimination

                    sub_result = run_substitution_elimination(
                        data.reactants, data.conditions
                    )

                elif rule.id == "intramolecular_substitution":
                    if len(data.reactants) > 1:
                        continue
                    from substitution_elimination import run_substitution_elimination

                    sub_result = run_substitution_elimination(
                        data.reactants, data.conditions
                    )

                else:
                    execution_result = run_reaction(
                        data.reactants,
                        rule.reaction_smarts,
                        debug=False,
                        auto_add=auto_add,
                    )
                    # Continue to standard result formatting
                    results.append(
                        {
                            "reactionId": rule.id,
                            "reactionName": rule.name,
                            "curriculum_subsubject_id": rule.curriculum_subsubject_id,
                            "matchExplanation": rule.match_explanation,
                            "products": [
                                {"smiles": p, "selectivity": "major"}
                                for p in execution_result["organic"]
                            ],
                            "byproducts": execution_result["inorganic"],
                            "smarts": rule.reaction_smarts,
                            "autoAdd": rule.auto_add,
                            "rank": rule.rank,
                        }
                    )
                    continue

                # Handle sub_result from special cases
                mech_label = None
                if sub_result.get("mechanisms"):
                    mech_label = "/".join(sub_result["mechanisms"])

                # Skip if no products (e.g. "No Reaction" or error)
                if not sub_result.get("products"):
                    continue

                results.append(
                    {
                        "reactionId": rule.id,
                        "reactionName": rule.name,
                        "curriculum_subsubject_id": rule.curriculum_subsubject_id,
                        "matchExplanation": sub_result.get(
                            "explanation", rule.match_explanation
                        ),
                        "products": [
                            {"smiles": p, "selectivity": "mixture"}
                            for p in sub_result.get("products", [])
                        ],
                        "byproducts": [],
                        "smarts": rule.reaction_smarts,
                        "autoAdd": rule.auto_add,
                        "rank": rule.rank,
                        "mechanism": mech_label,
                    }
                )
                continue

                execution_result = run_reaction(
                    data.reactants, rule.reaction_smarts, debug=False, auto_add=auto_add
                )

                # Format Result
                # We need to return structure compatible with frontend expectation
                results.append(
                    {
                        "reactionId": rule.id,
                        "reactionName": rule.name,
                        "curriculum_subsubject_id": rule.curriculum_subsubject_id,
                        "matchExplanation": rule.match_explanation,
                        "products": [
                            {"smiles": p, "selectivity": "major"}
                            for p in execution_result["organic"]
                        ],  # Todo: Implement selectivity logic in execution
                        "byproducts": execution_result["inorganic"],
                        "smarts": rule.reaction_smarts,
                        "autoAdd": rule.auto_add,
                        "rank": rule.rank,
                        # "mechanism": ...
                    }
                )
            except Exception as e:
                print(f"Error executing rule {rule.id}: {e}")
                # Skip this rule if execution fails, or report error?
                continue

        return results

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
