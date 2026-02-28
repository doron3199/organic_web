import logging
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from schemas import (
    ChiralityRequest,
    ProposeRequest,
    ReactionRequest,
    ResonanceRequest,
    SubstitutionRequest,
)
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from resonance_service import (
    get_resonance_structures as get_resonance_structures_service,
)
from chirality_service import get_chiral_centers as get_chiral_centers_service

from reactions.rules import register_rules
from reaction_service import (
    get_propose_results,
    execute_single_reaction,
    execute_substitution_elimination,
)
from security import (
    check_chirality_security,
    check_reaction_security,
    check_substitution_security,
    check_propose_security,
    check_resonance_security,
)

# Configure logging: engine modules at DEBUG, everything else at INFO
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logging.getLogger("engine").setLevel(logging.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    register_rules()
    yield


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173",
        ).split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/reaction")
@limiter.limit("10/minute")
async def execute_reaction(request: Request, data: ReactionRequest):
    if not data.reactionId and not os.getenv("DEV"):
        raise HTTPException(
            status_code=403,
            detail="Arbitrary SMARTS execution is restricted to DEV environments.",
        )
    try:
        check_reaction_security(data)
        return execute_single_reaction(
            data.reactants,
            data.smarts,
            debug=data.debug,
            auto_add=data.autoAdd,
            reaction_name=data.reactionName,
            reaction_id=data.reactionId,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reaction/substitution_elimination")
@limiter.limit("10/minute")
async def execute_sub_elim(request: Request, data: SubstitutionRequest):
    try:
        check_substitution_security(data)
        return execute_substitution_elimination(data.reactants, data.conditions)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reactions/propose")
async def propose_reactions(request: Request, data: ProposeRequest):
    try:
        check_propose_security(data)
        return get_propose_results(data.reactants, data.conditions)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/resonance")
@limiter.limit("10/minute")
async def get_resonance_structures(request: Request, data: ResonanceRequest):
    try:
        check_resonance_security(data)
        return get_resonance_structures_service(data)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chirality")
@limiter.limit("20/minute")
async def get_chirality(request: Request, data: ChiralityRequest):
    try:
        check_chirality_security(data)
        return get_chiral_centers_service(data.smiles, data.name, data.locant_map)
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
