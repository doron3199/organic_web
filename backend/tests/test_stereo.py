"""
Tests for the stereochemistry post-processing module (engine/stereo.py).

Covers:
- SN2 Walden inversion
- SN1 racemization
- Syn-addition (KMnO4 hydroxylation, hydroboration)
- Anti-addition (halogenation, halohydrin)
- postprocess_stereo dispatcher
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rdkit import Chem
from engine.stereo import (
    apply_sn2_inversion,
    apply_sn1_racemization,
    apply_syn_addition_stereo,
    apply_anti_addition_stereo,
    postprocess_stereo,
)


def canonical(smi, stereo=True):
    mol = Chem.MolFromSmiles(smi)
    if mol is None:
        return smi
    return Chem.MolToSmiles(mol, isomericSmiles=stereo)


def compare_smiles(actual, expected, stereo=True):
    return canonical(actual, stereo=stereo) == canonical(expected, stereo=stereo)


# ============================================================================
# SN2 — Walden Inversion
# ============================================================================


class TestSN2Inversion:
    def test_r_substrate_gives_s_product(self):
        """(R)-2-bromobutane + NaOH -> product should be (S) at C2."""
        substrate = "[C@@H](Br)(CC)C"  # R at the alpha-C
        # Simulate a product where Br is replaced by OH (no stereo yet)
        product = "C(O)(CC)C"
        expected = "CC[C@@H](C)O"

        inverted, note = apply_sn2_inversion(substrate, [product])
        assert note is not None
        assert "inversion" in note.lower() or "inverted" in note.lower()
        # The product should now have defined stereo
        for p in inverted:
            mol = Chem.MolFromSmiles(p)
            assert mol is not None
        assert len(inverted) == 1
        assert compare_smiles(inverted[0], expected)

    def test_s_substrate_gives_r_product(self):
        """(S) substrate -> (R) product after SN2 inversion."""
        substrate = "[C@H](Br)(CC)C"  # S at the alpha-C
        product = "C(O)(CC)C"
        expected = "CC[C@H](C)O"

        inverted, note = apply_sn2_inversion(substrate, [product])
        assert note is not None
        assert "R" in note and "S" in note
        assert len(inverted) == 1
        assert compare_smiles(inverted[0], expected)

    def test_achiral_substrate_returns_note_about_backside(self):
        """Methyl halide (no stereocenter) still returns conceptual note."""
        substrate = "CBr"
        product = "CO"
        expected = "CO"

        result, note = apply_sn2_inversion(substrate, [product])
        # No stereo can be assigned but products should pass through
        assert len(result) == 1
        assert compare_smiles(result[0], expected)
        # For achiral substrates, no specific R/S note
        # (methyl has no possible stereocenter either)

    def test_products_unchanged_when_no_stereocenter(self):
        """Products without stereocenters pass through unmodified."""
        substrate = "CCBr"  # Primary, no chiral center
        product = "CCO"
        expected = "CCO"

        result, note = apply_sn2_inversion(substrate, [product])
        assert len(result) == 1
        assert compare_smiles(result[0], expected)
        assert note is None

    def test_inversion_note_mentions_walden(self):
        """SN2 note should mention Walden inversion or backside attack."""
        substrate = "[C@@H](Br)(CC)C"
        product = "C(O)(CC)C"
        expected = "CC[C@@H](C)O"

        inverted, note = apply_sn2_inversion(substrate, [product])
        assert note is not None
        assert "backside" in note.lower() or "walden" in note.lower()
        assert len(inverted) == 1
        assert compare_smiles(inverted[0], expected)


# ============================================================================
# SN1 — Racemization
# ============================================================================


class TestSN1Racemization:
    def test_chiral_substrate_gives_both_enantiomers(self):
        """(R)-2-bromobutane under SN1 -> both (R) and (S) alcohol products."""
        substrate = "[C@@H](Br)(CC)C"
        product = "C(O)(CC)C"
        expected = {"CC[C@@H](C)O", "CC[C@H](C)O"}

        racemic, note = apply_sn1_racemization(substrate, [product])
        assert note is not None
        assert "racemic" in note.lower()
        # Should have both enantiomers
        assert {canonical(p) for p in racemic} == {canonical(e) for e in expected}

    def test_racemization_note_mentions_planar(self):
        """SN1 note should mention planar carbocation intermediate."""
        substrate = "[C@@H](Br)(CC)C"
        product = "C(O)(CC)C"
        expected = {"CC[C@@H](C)O", "CC[C@H](C)O"}

        racemic, note = apply_sn1_racemization(substrate, [product])
        assert note is not None
        assert "planar" in note.lower() or "carbocation" in note.lower()
        assert {canonical(p) for p in racemic} == {canonical(e) for e in expected}

    def test_achiral_substrate_passes_through(self):
        """Substrate without potential stereocenter -> products unchanged."""
        substrate = "C(C)(C)(C)Br"  # Tertiary but symmetric (neopentyl-like)
        product = "C(C)(C)(C)O"
        expected = "CC(C)(C)O"

        racemic, note = apply_sn1_racemization(substrate, [product])
        # No stereocenter possible, should pass through
        assert note is None
        assert len(racemic) == 1
        assert compare_smiles(racemic[0], expected)


# ============================================================================
# Syn-Addition (KMnO4 hydroxylation)
# ============================================================================


class TestSynAddition:
    def test_diol_product_gets_syn_stereo(self):
        """A 1,2-diol with two possible stereocenters gets syn assignment."""
        # 2,3-butanediol from 2-butene hydroxylation
        diol = "CC(O)C(O)C"
        expected = {"C[C@@H](O)[C@@H](C)O", "C[C@H](O)[C@H](C)O"}

        result, note = apply_syn_addition_stereo([diol])
        assert note is not None
        assert "syn" in note.lower()
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_cyclic_diol_gives_cis_product(self):
        """Cyclohexene + KMnO4 -> cis-1,2-cyclohexanediol (syn on ring)."""
        diol = "OC1CCCCC1O"  # cyclohexane-1,2-diol
        expected = {"O[C@@H]1CCCC[C@@H]1O"}

        result, note = apply_syn_addition_stereo([diol])
        assert note is not None
        assert "syn" in note.lower()
        # For symmetric cyclohexane-1,2-diol, (R,S)=(S,R) → meso → single product
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_symmetric_diol_may_give_meso(self):
        """Symmetric substrate may yield meso compound (single product)."""
        diol = "CC(O)C(O)C"  # Symmetric 2,3-butanediol
        expected = {"C[C@@H](O)[C@@H](C)O", "C[C@H](O)[C@H](C)O"}

        result, note = apply_syn_addition_stereo([diol])
        # Meso or enantiomeric pair — canonical SMILES may merge identical ones
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_no_diol_passes_through(self):
        """Product without 1,2-diol passes through unchanged."""
        product = "CCCO"
        expected = "CCCO"

        result, note = apply_syn_addition_stereo([product])
        assert note is None
        assert len(result) == 1
        assert compare_smiles(result[0], expected)


# ============================================================================
# Anti-Addition (halogenation)
# ============================================================================


class TestAntiAddition:
    def test_dihalide_gets_anti_stereo(self):
        """Vicinal dihalide product gets anti-addition stereo."""
        dihalide = "CC(Br)C(Br)C"
        expected = {"C[C@H](Br)[C@@H](C)Br"}

        result, note = apply_anti_addition_stereo([dihalide])
        assert note is not None
        assert "anti" in note.lower()
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_cyclic_dihalide_gives_trans_product(self):
        """Cyclohexene + Br2 -> trans-1,2-dibromocyclohexane (anti on ring)."""
        dihalide = "BrC1CCCCC1Br"
        expected = {"Br[C@@H]1CCCC[C@H]1Br", "Br[C@H]1CCCC[C@@H]1Br"}

        result, note = apply_anti_addition_stereo([dihalide])
        assert note is not None
        assert "anti" in note.lower()
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_no_dihalide_passes_through(self):
        """Product without vicinal dihalide passes through unchanged."""
        product = "CCBr"
        expected = "CCBr"

        result, note = apply_anti_addition_stereo([product])
        assert note is None
        assert len(result) == 1
        assert compare_smiles(result[0], expected)


# ============================================================================
# Dispatcher
# ============================================================================


class TestPostprocessStereoDispatcher:
    def test_dispatches_syn_for_hydroxylation(self):
        """postprocess_stereo routes alkene_hydroxylation to syn-addition."""
        diol = "CC(O)C(O)C"
        expected = {"C[C@@H](O)[C@@H](C)O", "C[C@H](O)[C@H](C)O"}
        result, note = postprocess_stereo("alkene_hydroxylation", [diol])
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_dispatches_anti_for_halogenation(self):
        """postprocess_stereo routes alkene_halogenation to anti-addition."""
        dihalide = "CC(Br)C(Br)C"
        expected = {"C[C@H](Br)[C@@H](C)Br"}
        result, note = postprocess_stereo("alkene_halogenation", [dihalide])
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_dispatches_sn2_with_mechanism(self):
        """postprocess_stereo routes SN2 mechanism to inversion handler."""
        substrate = "[C@@H](Br)(CC)C"
        product = "C(O)(CC)C"
        expected = "CC[C@@H](C)O"
        result, note = postprocess_stereo(
            "elimination_substitution",
            [product],
            substrate_smi=substrate,
            mechanism="SN2",
        )
        assert note is not None
        assert len(result) == 1
        assert compare_smiles(result[0], expected)

    def test_dispatches_sn1_with_mechanism(self):
        """postprocess_stereo routes SN1 mechanism to racemization handler."""
        substrate = "[C@@H](Br)(CC)C"
        product = "C(O)(CC)C"
        expected = {"CC[C@@H](C)O", "CC[C@H](C)O"}
        result, note = postprocess_stereo(
            "elimination_substitution",
            [product],
            substrate_smi=substrate,
            mechanism="SN1",
        )
        assert note is not None
        assert "racemic" in note.lower()
        assert {canonical(p) for p in result} == {canonical(e) for e in expected}

    def test_unrelated_reaction_passes_through(self):
        """Unknown reaction ID returns products unchanged."""
        product = "CCO"
        expected = "CCO"
        result, note = postprocess_stereo("some_other_reaction", [product])
        assert note is None
        assert len(result) == 1
        assert compare_smiles(result[0], expected)
