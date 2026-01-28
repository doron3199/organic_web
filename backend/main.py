from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
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
    smarts: str


class ReactionResponse(BaseModel):
    products: List[str]


@app.post("/reaction", response_model=ReactionResponse)
async def execute_reaction(request: ReactionRequest):
    try:
        products = run_reaction(request.reactants, request.smarts)
        return {"products": products}
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
