from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Union
import uvicorn
from reaction_logic import run_reaction

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReactionRequest(BaseModel):
    reactants: List[str]
    smarts: Union[str, List[str]]
    debug: bool = False  # Optional, defaults to False
    autoAdd: List[Union[str, dict]] = []  # Optional: molecules to auto-add at each step


class ReactionResponse(BaseModel):
    products: List[str]
    byproducts: List[str]


@app.post("/reaction")
async def execute_reaction(request: ReactionRequest):
    """
    Execute a reaction. Returns simple products if debug=False,
    or detailed step-by-step info if debug=True.
    """
    try:
        result = run_reaction(
            request.reactants,
            request.smarts,
            debug=request.debug,
            auto_add=request.autoAdd,
        )

        if request.debug:
            # Return debug format
            return result
        else:
            # Return simple format
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
async def execute_reaction_debug(request: ReactionRequest):
    """Run a reaction and return all intermediate steps for debugging."""
    try:
        result = run_reaction(
            request.reactants, request.smarts, debug=True, auto_add=request.autoAdd
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ParseRequest(BaseModel):
    smiles: str


@app.post("/parse")
async def parse_smiles(request: ParseRequest):
    try:
        from rdkit import Chem

        mol = Chem.MolFromSmiles(request.smiles)
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
