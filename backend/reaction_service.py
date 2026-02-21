import logging
from engine import run_reaction
from engine.stereo import postprocess_stereo
from engine.helpers import normalize_smarts_for_json
from reactions.matcher import find_matching_reactions
from reactions.models import SmartsEntry
from engine.substitution_elimination import run_substitution_elimination

logger = logging.getLogger(__name__)


def _collect_stereo_notes(sub_result):
    """Gather all stereo notes from per_mechanism entries."""
    notes = []
    for pm in sub_result.get("per_mechanism", []):
        note = pm.get("stereo_note")
        if note:
            notes.append(note)
    return " ".join(notes) if notes else None


def _collect_step_explanations(rule):
    """
    Collect per-step explanations from SmartsEntry objects in the
    reaction_smarts list.  Returns a list of strings (may be empty).
    """
    explanations = []
    smarts = rule.reaction_smarts
    if isinstance(smarts, str):
        return explanations
    if isinstance(smarts, SmartsEntry):
        if smarts.explanation:
            explanations.append(smarts.explanation)
        return explanations
    for entry in smarts:
        if isinstance(entry, SmartsEntry) and entry.explanation:
            explanations.append(entry.explanation)
    return explanations


def _collect_step_stereo_rules(rule):
    """
    Return the rule-level stereo rules, or ``None`` if none are set.
    """
    return rule.stereo_rules or None


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
                        "smarts": normalize_smarts_for_json(rule.reaction_smarts),
                        "autoAdd": rule.auto_add,
                        "rank": rule.rank,
                        "mechanism": "/".join(sub_result["mechanisms"])
                        if sub_result.get("mechanisms")
                        else None,
                        "perMechanism": sub_result.get("per_mechanism"),
                        "stereoNote": _collect_stereo_notes(sub_result),
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

            organic_products = execution_result["organic"]

            # --- Stereochemistry post-processing ---
            stereo_rules = _collect_step_stereo_rules(rule)
            stereo_products, stereo_note = postprocess_stereo(
                rule.id, organic_products, stereo_rules=stereo_rules
            )

            # Collect step explanations from SmartsEntry objects
            step_explanations = _collect_step_explanations(rule)

            product_selectivity = execution_result.get("product_selectivity", {})

            # Build products with selectivity labels
            products_with_sel = []
            for p in stereo_products:
                products_with_sel.append(
                    {"smiles": p, "selectivity": product_selectivity.get(p, "major")}
                )
            # If 2+ products share "major", downgrade to "equal"
            major_count = sum(
                1 for item in products_with_sel if item["selectivity"] == "major"
            )
            if major_count >= 2:
                for item in products_with_sel:
                    if item["selectivity"] == "major":
                        item["selectivity"] = "equal"

            result_entry = {
                "reactionId": rule.id,
                "reactionName": rule.name,
                "curriculum_subsubject_id": rule.curriculum_subsubject_id,
                "matchExplanation": rule.match_explanation,
                "products": products_with_sel,
                "byproducts": execution_result["inorganic"],
                "smarts": normalize_smarts_for_json(rule.reaction_smarts),
                "autoAdd": rule.auto_add,
                "rank": rule.rank,
                "stereoNote": stereo_note,
            }

            if step_explanations:
                result_entry["stepExplanations"] = step_explanations

            results.append(result_entry)

        except Exception as e:
            print(f"Error executing rule {rule.id}: {e}")
            continue

    # --- Cross-reaction rank-based selectivity ---
    # When multiple reactions matched, sort by rank (highest first) and
    # demote every reaction below the top rank to "minor".
    if len(results) > 1:
        results.sort(key=lambda r: r.get("rank") or 0, reverse=True)
        top_rank = results[0].get("rank") or 0
        for res in results:
            if (res.get("rank") or 0) < top_rank:
                for p in res["products"]:
                    p["selectivity"] = "minor"

    return results


def execute_single_reaction(
    reactants: list[str],
    smarts: str | list[str],
    debug: bool = False,
    auto_add: list[str | dict] | None = None,
    reaction_name: str | None = None,
    reaction_id: str | None = None,
) -> dict:
    """
    Executes a specific reaction defined by SMARTS.
    Wraps the core run_reaction logic and handles formatting.

    If ``reaction_id`` is provided, the full rule is looked up from the
    registry so that SmartsEntry metadata (explanations, selectivity)
    is available to the engine.
    """
    # When a reaction_id is supplied, prefer the rich reaction_smarts
    # from the registry (contains SmartsEntry objects with selectivity
    # and explanation data).
    effective_smarts: str | list = smarts
    if reaction_id:
        from reactions.registry import ReactionRegistry
        rule = ReactionRegistry.get_instance().get(reaction_id)
        if rule and rule.reaction_smarts:
            effective_smarts = rule.reaction_smarts

    result = run_reaction(
        reactants, effective_smarts, debug=debug, auto_add=auto_add,
        reaction_name=reaction_name,
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
