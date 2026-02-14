import logging
from engine import run_reaction
from reactions.matcher import find_matching_reactions
from engine.substitution_elimination import run_substitution_elimination

logger = logging.getLogger(__name__)


def get_propose_results(reactants: list[str], conditions: list[str]) -> list[dict]:
    """
    Finds matching reaction rules and executes them, formatting results for the frontend.
    Handles special cases like the substitution/elimination engine.
    """
    logger.debug(f"get_propose_results: reactants={reactants}, conditions={conditions}")

    # 1. Match Rules
    matches = find_matching_reactions(reactants, set(conditions))
    logger.debug(f"Found {len(matches)} matching reactions")

    results = []

    for rule in matches:
        auto_add = rule.auto_add if rule.auto_add else []

        try:
            # Special handling for Substitution/Elimination engine
            if rule.id == "elimination_substitution":
                sub_result = run_substitution_elimination(reactants, conditions)

                # Skip if no products (e.g. "No Reaction" or error)
                if not sub_result.get("products"):
                    continue

                reaction_name = rule.name
                if "Intramolecular_SN2" in sub_result.get("mechanisms", []):
                    reaction_name = "Intramolecular Substitution"

                results.append(
                    {
                        "reactionId": rule.id,
                        "reactionName": reaction_name,
                        "curriculum_subsubject_id": rule.curriculum_subsubject_id,
                        "matchExplanation": sub_result.get(
                            "explanation", rule.match_explanation
                        ),
                        "products": [
                            {"smiles": p, "selectivity": "mixture"}
                            for p in sub_result.get("products", [])
                        ],
                        "byproducts": sub_result.get("inorganic", []),
                        "smarts": rule.reaction_smarts,
                        "autoAdd": rule.auto_add,
                        "rank": rule.rank,
                        "mechanism": "/".join(sub_result["mechanisms"])
                        if sub_result.get("mechanisms")
                        else None,
                        "perMechanism": sub_result.get("per_mechanism"),
                    }
                )
                continue

            # Standard Rule Execution
            execution_result = run_reaction(
                reactants,
                rule.reaction_smarts,
                debug=False,
                auto_add=auto_add,
                reaction_name=rule.name,
            )

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

        except Exception as e:
            print(f"Error executing rule {rule.id}: {e}")
            continue

    return results


def execute_single_reaction(
    reactants: list[str],
    smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
    reaction_name: str | None = None,
) -> dict:
    """
    Executes a specific reaction defined by SMARTS.
    Wraps the core run_reaction logic and handles formatting.
    """
    result = run_reaction(
        reactants, smarts, debug=debug, auto_add=auto_add, reaction_name=reaction_name
    )
    if debug:
        return result
    return {"products": result["organic"], "byproducts": result["inorganic"]}


def execute_substitution_elimination(
    reactants: list[str], conditions: list[str]
) -> dict:
    """
    Executes the specialized substitution/elimination engine.
    """
    return run_substitution_elimination(reactants, conditions)
