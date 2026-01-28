import sys
import os


# Try to find the reaction_logic module
current_dir = os.path.dirname(os.path.abspath(__file__))
# If we are in backend/, parent is valid. If we are in backend/tests/, parent is backend/
# Let's add the current directory to path just in case
sys.path.append(current_dir)

# Also try adding the parent directory if run from a subdir or if reaction_logic is in parent
sys.path.append(os.path.dirname(current_dir))

try:
    from reaction_logic import run_reaction

    print("Successfully imported run_reaction from reaction_logic")
except ImportError:
    # Try importing with package prefix if we are running from root
    try:
        from backend.reaction_logic import run_reaction

        print("Successfully imported backend.reaction_logic")
    except ImportError as e:
        print(f"Could not import reaction_logic: {e}")
        sys.exit(1)


def run_single_reaction_check(name, reactants, smarts, expected_smiles_patterns=None):
    print(f"\nExample Reaction: {name}")
    print(f"  Reactants: {reactants}")
    print(f"  SMARTS:    {smarts}")

    try:
        products = run_reaction(reactants, smarts)
        print(f"  Products:  {products}")

        if expected_smiles_patterns:
            all_found = True
            for pat in expected_smiles_patterns:
                # Naive check if pattern is in any product string
                # Ideally we canonicalize, but string match is a start
                found = any(pat in p for p in products)
                if not found:
                    print(f"  [FAIL] Expected pattern '{pat}' not found in products.")
                    all_found = False

            if all_found and products:
                print("  [PASS] Expected products found.")
            elif not products:
                print("  [FAIL] No products generated.")

    except Exception as e:
        print(f"  [ERROR] Exception during execution: {e}")


if __name__ == "__main__":
    print("Starting Manual Reaction Tests...")

    # 1. Simple Radical Halogenation (simplified as substitution for testing)
    # C-H -> C-Cl
    # Reaction: C-H -> C-Cl
    # Uses atom-mapped SMARTS to track atoms.
    run_single_reaction_check(
        "Ethane Chlorination (Substations)",
        ["CC", "ClCl"],
        "[C;!H0:1].[Cl:2][Cl:3]>>[C:1][Cl:2].[Cl:3]",
        ["CCCl"],
    )

    # 2. Alcohol Dehydration to Alkene
    # ethanol -> ethene
    # [C:1][C:2][O:3]>>[C:1]=[C:2]
    run_single_reaction_check(
        "Ethanol Dehydration", ["CCO"], "[C:1][C:2][O:3]>>[C:1]=[C:2]", ["C=C"]
    )

    # 3. Grignard Addition (Simplified) / Hydration
    # Reaction: C=C + H2O -> C(O)C
    run_single_reaction_check(
        "Ethene Hydration",
        ["C=C", "O"],  # O is water
        "[C:1]=[C:2].[O:3]>>[C:1][C:2][O:3]",
        ["CCO"],
    )

    # 4. SN2 Reaction
    # Chloromethane + Hydroxide -> Methanol + Chloride
    # [C:1][Cl:2].[O:3]>>[C:1][O:3].[Cl:2]
    # Reactants: CCl, [OH-]
    run_single_reaction_check(
        "SN2: Chloromethane + Hydroxide",
        ["CCl", "[OH-]"],
        "[C:1][Cl:2].[O:3]>>[C:1][O:3].[Cl:2]",
        ["C[O-]"],
    )
