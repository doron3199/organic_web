from .models import ReactionRule, ReactionSelectivity, SelectivityRule
from .registry import ReactionRegistry


# Helper to create sets for OR conditions
def create_condition_sets(*conds: str) -> list[set[str]]:
    sets = []
    n = len(conds)
    # Generate all non-empty subsets
    for i in range(1, 1 << n):
        s = set()
        for j in range(n):
            if (i >> j) & 1:
                s.add(conds[j])
        sets.append(s)
    return sets


def register_rules():
    registry = ReactionRegistry.get_instance()

    # --- ALKANES ---
    registry.register(
        ReactionRule(
            id="alkane_halogenation_br",
            name="Free Radical Bromination",
            curriculum_subsubject_id="alkanes-reactions",
            reaction_smarts="[C;H1,H2,H3,H4:1].[Br][Br]>>[C:1][Br].[Br]",
            reactants_smarts=["[#6;H1,H2,H3,H4]", "[Br][Br]"],
            match_explanation="Alkane + Br2",
            description="Selective substitution of Hydrogen with Bromine at the most substituted carbon.",
            conditions=create_condition_sets("light", "heat"),
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][Br]", label="major"),
                    SelectivityRule(smarts="[C;D3][Br]", label="minor"),
                    SelectivityRule(smarts="[C;D2][Br]", label="minor"),
                    SelectivityRule(smarts="[C;D1][Br]", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkane_halogenation_cl",
            name="Free Radical Chlorination",
            curriculum_subsubject_id="alkanes-reactions",
            reaction_smarts="[C;H1,H2,H3,H4:1].[Cl][Cl]>>[C:1][Cl].[Cl]",
            reactants_smarts=["[#6;H1,H2,H3,H4]", "[Cl][Cl]"],
            match_explanation="Alkane + Cl2",
            description="Substitution of Hydrogen with Chlorine (Low selectivity).",
            conditions=create_condition_sets("light", "heat"),
        )
    )

    # --- ALKENES ---
    registry.register(
        ReactionRule(
            id="alkene_hydrohalogenation",
            name="Hydrohalogenation (HX)",
            rank=20,
            curriculum_subsubject_id="alkenes-hydrohalogenation",
            reaction_smarts=[
                "[C:1]=[C:2].[F,Cl,Br,I:3]>>[C:1][C+:2].[F-,Cl-,Br-,I-:3]",
                "[C+:1].[F-,Cl-,Br-,I-:2]>>[C+0:1][*+0:2]",
            ],
            reactants_smarts=["[C]=[C]", "[F,Cl,Br,I;H1]"],
            match_explanation="Alkene + HX (X=F, Cl, Br, I)",
            description="Addition of H-X across a double bond (Markovnikov).",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][F,Cl,Br,I]", label="major"),
                    SelectivityRule(smarts="[C;D3][F,Cl,Br,I]", label="major"),
                    SelectivityRule(smarts="[C;D2][F,Cl,Br,I]", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_hydration",
            name="Acid-Catalyzed Hydration",
            rank=20,
            curriculum_subsubject_id="alkenes-hydration",
            reaction_smarts=[
                "[C:1]=[C:2].[OX2H1:3][SX4:4] >> [C+:1]-[C:2].[O-H0:3][SX4:4]",
                "[C+:1].[OH2:5] >> [C+0:1]-[OH2+:5]",
                "[C:1]-[OH2+:2].[O-:3][S:4][OH:5] >> [C:1]-[O+0H:2].[O+0H:3][S:4][OH:5]",
            ],
            reactants_smarts=["[C]=[C]", "[OH2]", "[$([SX4](=[OX1])(=[OX1])[OX2H1])]"],
            match_explanation="Alkene + H2O",
            description="Addition of water to form an alcohol (Markovnikov).",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][OH]", label="major"),
                    SelectivityRule(smarts="[C;D3][OH]", label="major"),
                    SelectivityRule(smarts="[C;D2][OH]", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_alcohol_addition",
            name="Acid-Catalyzed Alcohol Addition",
            rank=20,
            curriculum_subsubject_id="alkenes-alcohol-addition",
            reaction_smarts=[
                "[C:1]=[C:2].[OX2H1:3][SX4:4] >> [C+:1]-[C:2].[O-H0:3][SX4:4]",
                "[C+:1].[OH:5][C:2] >> [C+0:1]-[OH+:5][C:2]",
                "[C:1][OH1:2][C:3].[O-:4][S:5][OH:6] >>  [C:1][O+0H0:2][C:3].[O+0H:4][S:5][OH:6]",
            ],
            reactants_smarts=[
                "[C]=[C]",
                "[O;H1][C]",
                "[$([SX4](=[OX1])(=[OX1])[OX2H1])]",
            ],
            match_explanation="Alkene + Alcohol",
            description="Addition of an alcohol to form an ether (Markovnikov).",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4]OC", label="major"),
                    SelectivityRule(smarts="[C;D3]OC", label="major"),
                    SelectivityRule(smarts="[C;D2]OC", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_hydroboration",
            name="Hydroboration-Oxidation",
            curriculum_subsubject_id="alkenes-hydroboration",
            reaction_smarts=[
                "[C;H2,H1:1]=[C;H1,H0:2].[BH3:3]>>[C:1]([H])([BH2:3])[C:2]([H])",
                "[C:1][BH2:2].[OH-:3].[OH2:5].[O:6][O:7]>>[C:1][OH].[BH2:2][O+0H1:3]",
            ],
            reactants_smarts=["[C]=[C]", "[B]"],
            match_explanation="Alkene + BH3 (Hydroboration)",
            auto_add=["", "[OH-].OO.O"],
            description="Addition of H-OH with Anti-Markovnikov regioselectivity via hydroboration-oxidation.",
            conditions=[set()],
            rank=20,
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_halogenation",
            name="Halogenation",
            rank=20,
            curriculum_subsubject_id="alkenes-halogenation",
            reaction_smarts=[
                "[C:1]=[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]",
                "[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]>>[C:1]([Br+0,Cl+0:4])[C:2]([Br+0,Cl+0:3])",
            ],
            reactants_smarts=["[C]=[C]", "[Br,Cl][Br,Cl]"],
            match_explanation="Alkene + Halogen (Br2 or Cl2)",
            description="Anti-addition of Halogen to form a vicinal dihalide.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_halohydrin",
            name="Halohydrin Formation",
            rank=21,
            curriculum_subsubject_id="alkenes-halogenation",
            reaction_smarts=[
                "[C:1]=[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]",
                "[C:1]1[C:2][Br+,Cl+:3]1.[OH2:5]>>[C:1]([O+H2:5])[C:2]([Br+0,Cl+0:3])",
                "[C:1]([O+H2:5])[C:2]([Br,Cl:3]).[O:6]>>[C:1]([O+0H1:5])[C:2]([Br,Cl:3]).[O+:6]",
                "[OH3:8].[Br-,Cl-:7]>>[O+0H2:8].[Br+0,Cl+0:7]",
            ],
            reactants_smarts=["[C]=[C]", "[Br,Cl][Br,Cl]", "[OH2]"],
            match_explanation="Alkene + Halogen + H2O",
            auto_add=["", "", "O", ""],
            description="Addition of OH and Halogen (OH to more substituted Carbon).",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][OH]", label="major"),
                    SelectivityRule(smarts="[C;D3][OH]", label="major"),
                    SelectivityRule(smarts="[C;D2][OH]", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_hydrogenation",
            name="Hydrogenation",
            curriculum_subsubject_id="alkenes-hydrogenation",
            reaction_smarts="[C:1]=[C:2].[HH]>>[C:1][C:2]",
            reactants_smarts=["[C]=[C]", "[HH]"],
            match_explanation="Alkene + H2 (or H source)",
            description="Reduction of double bond to single bond.",
            conditions=[set(["pd_c"])],
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_epoxidation",
            name="Epoxidation",
            rank=20,
            curriculum_subsubject_id="alkenes-epoxidation",
            reaction_smarts="[C:1]=[C:2].[CX3:3](=[OX1:4])[OX2:5][OX2H1:6] >> [C:1]1[OX2:6][C:2]1.[CX3:3](=[OX1:4])[OX2H1:5]",
            reactants_smarts=["[C]=[C]", "[CX3](=[OX1])[OX2][OX2H1]"],
            match_explanation="Alkene + Peroxyacid (mCPBA)",
            description="Formation of an epoxide ring.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_ozonolysis",
            name="Ozonolysis (Reductive)",
            rank=20,
            curriculum_subsubject_id="alkenes-ozonolysis",
            reaction_smarts="[C:1]=[C:2].[O-][O+]=O>>[C:1]=[O].[C:2]=[O]",  # Cleavage logic
            reactants_smarts=["[C]=[C]", "[O-][O+]=O"],
            match_explanation="Alkene (Ozonolysis)",
            description="Cleavage of double bond to form Carbonyls.",
            conditions=[set(["cold"])],
        )
    )

    registry.register(
        ReactionRule(
            id="alkene_hydroxylation",
            name="Syn-Hydroxylation",
            rank=20,
            curriculum_subsubject_id="alkenes-hydroxylation",
            reaction_smarts=[
                "[C:1]=[C:2].[O-][Mn](=O)(=O)=O>>[C:1]1[O][Mn](=O)([O-])[O][C:2]1",
                "[C:1]1[O][Mn](=O)([O-])[O][C:2]1.[OH2:3]>>[C:1]([OH])[C:2]([OH])",
            ],
            reactants_smarts=["[C]=[C]", "[O-][Mn](=O)(=O)=O"],
            match_explanation="Alkene + KMnO4 (Syn-Hydroxylation)",
            auto_add=["", "O.O"],
            description="Formation of a cis-diol via cyclic manganate ester.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_hydrohalogenation_2eq",
            name="Hydrohalogenation",
            curriculum_subsubject_id="alkynes-addition",
            reaction_smarts=[
                "[C:1]#[C:2].[F,Cl,Br,I:3]>>[C+:1]=[C:2].[F-,Cl-,Br-,I-:3]",
                "[C+:1]=[C:2].[F-,Cl-,Br-,I-:3]>>[C+0:1]=[C:2]([F+0,Cl+0,Br+0,I+0:3])",
            ],
            # append_reaction="alkene_hydrohalogenation",
            reactants_smarts=["[C]#[C]", "[F,Cl,Br,I;H1]"],
            match_explanation="Alkyne + HX (X=F, Cl, Br, I)",
            description="Addition of HX to form Geminal Dihalide.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_halogenation_2eq",
            name="Halogenation",
            curriculum_subsubject_id="alkynes-addition",
            reaction_smarts=[
                "[C:1]#[C:2].[Br,Cl:3][Br,Cl:4]>>[C:1]1=[C:2][Br+,Cl+:3]1.[Br-,Cl-:4]",
                "[C:1]1=[C:2][Br,Cl+:3]1.[Br-,Cl-:4]>>[C:1]([Br+0,Cl+0:4])=[C:2]([Br+0,Cl+0:3])",
            ],
            reactants_smarts=["[C]#[C]", "[Br,Cl][Br,Cl]"],
            # append_reaction="alkene_halogenation",
            match_explanation="Alkyne + Br2",
            description="Addition of Br2 to form Tetrahaloalkane.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_hydration_acid",
            name="Acid-Catalyzed Hydration",
            curriculum_subsubject_id="alkynes-hydration-acid",
            reaction_smarts=[
                "[C:1]#[C:2].[OX2H1:3][SX4:4] >> [C+:1]=[C:2].[O-H0:3][SX4:4]",
                "[C+:1].[OH2:5] >> [C+0:1]-[OH2+:5]",
                "[C:1]-[OH2+:2].[O-:3][S:4][OH:5] >> [C:1]-[O+0H:2].[O+0H:3][S:4][OH:5]",
                "[C:1]=[C:2]-[OH1:3] >> [C:1]-[C:2]=[OH0:3]",
            ],
            reactants_smarts=["[C]#[C]", "[OH2]", "[$([SX4](=[OX1])(=[OX1])[OX2H1])]"],
            match_explanation="Alkyne + H2O",
            description="Hydration to form a Ketone (Markovnikov).",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D3]=O", label="major"),
                    SelectivityRule(smarts="[C;D2]=O", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_hydroboration",
            name="Hydroboration-Oxidation",
            curriculum_subsubject_id="alkynes-hydration",
            reaction_smarts=[
                "[C;H2,H1:1]#[C;H1,H0:2].[BH3:3]>>[C:1]([H])([BH2:3])=[C:2]([H])",
                "[C:1][BH2:2].[OH-:3].[OH2:5].[O:6][O:7]>>[C:1][OH].[BH2:2][O+0H1:3]",
                "[C:1]=[C:2]-[OH1:3] >> [C:1]-[C:2]=[OH0:3]",
            ],
            reactants_smarts=["[C]#[C]", "[B]"],
            auto_add=["", "[OH-].OO.O"],
            match_explanation="Terminal Alkyne (Hydroboration)",
            description="Addition of H-OH with Anti-Markovnikov regioselectivity via hydroboration-oxidation.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_reduction_complete",
            name="Complete Reduction",
            curriculum_subsubject_id="alkynes-reduction",
            reaction_smarts="[C:1]#[C:2].[HH].[HH]>>[C:1][C:2]",
            reactants_smarts=["[C]#[C]", "[HH]", "[HH]"],
            match_explanation="Alkyne + H2",
            description="Reduction to Alkane.",
            conditions=[set(["pd_c"])],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_reduction_cis",
            name="Lindlar Reduction",
            curriculum_subsubject_id="alkynes-reduction",
            reaction_smarts="[#6:3][#6:1]#[#6:2][#6:4].[HH]>>[#6:3]/[#6:1]=[#6:2]\\[#6:4]",
            reactants_smarts=["[C]#[C]", "[HH]"],
            match_explanation="Alkyne + H2 (Lindlar)",
            description="Reduction to Cis-Alkene.",
            conditions=[set(["lindlar"])],
        )
    )

    registry.register(
        ReactionRule(
            id="alkyne_deprotonation",
            name="Alkyne Deprotonation",
            curriculum_subsubject_id="alkynes-alkylation",
            reaction_smarts="[C:1]#[C;H1:2].[NH2-]>>[C:1]#[C-:2].[NH3]",
            reactants_smarts=["[C]#[C;H1]", "[N-H2]"],
            match_explanation="Terminal Alkyne + Strong Base (NaNH2)",
            description="Deprotonation of terminal alkyne to form acetylide ion.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="acetylide_alkylation",
            name="Acetylide Alkylation",
            curriculum_subsubject_id="alkynes-alkylation",
            reaction_smarts="[C:1]#[C-:2].[C:3][F,Cl,Br,I:4]>>[C:1]#[C+0:2][C:3].[F-,Cl-,Br-,I-:4]",
            reactants_smarts=["[C]#[C-]", "[C][F,Cl,Br,I]"],
            match_explanation="Acetylide Ion + Alkyl Halide",
            description="SN2 attack of acetylide on alkyl halide to form new C-C bond.",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank", rules=[SelectivityRule(smarts="[C]#[C][C]", label="major")]
            ),
        )
    )

    # --- CARBONYLS ---
    registry.register(
        ReactionRule(
            id="acid_to_acyl_chloride",
            name="Formation of Acyl Chloride",
            curriculum_subsubject_id="carboxylic-acids",
            reaction_smarts="[C:1](=[O:2])[OH]>>[C:1](=[O:2])[Cl]",
            reactants_smarts=["[C](=[O])[OH]", "[$([S](=O)(Cl)Cl)]"],
            match_explanation="Carboxylic Acid + SOCl2",
            description="Conversion to Acyl Chloride using Thionyl Chloride.",
            conditions=[set(["socl2"])],
        )
    )

    registry.register(
        ReactionRule(
            id="acyl_chloride_hydrolysis",
            name="Acyl Chloride Hydrolysis",
            curriculum_subsubject_id="acyl-chlorides",
            reaction_smarts="[C:1](=[O:2])[Cl].[OH2:3]>>[C:1](=[O:2])[OH:3]",
            reactants_smarts=["[C](=[O])[Cl]", "[OH2]"],
            match_explanation="Acyl Chloride + Water",
            description="Vigorous hydrolysis to Carboxylic Acid.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="acyl_chloride_alcoholysis",
            name="Acyl Chloride Alcoholysis",
            curriculum_subsubject_id="acyl-chlorides",
            reaction_smarts="[C:1](=[O:2])[Cl].[C:3][OH:4]>>[C:1](=[O:2])[O:4][C:3]",
            reactants_smarts=["[C](=[O])[Cl]", "[C][OH]"],
            match_explanation="Acyl Chloride + Alcohol",
            description="Formation of Ester.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="acyl_chloride_aminolysis",
            name="Acyl Chloride Aminolysis",
            curriculum_subsubject_id="acyl-chlorides",
            reaction_smarts="[C:1](=[O:2])[Cl].[N;H2,H1:3]>>[C:1](=[O:2])[N:3]",
            reactants_smarts=["[C](=[O])[Cl]", "[N;H2,H1]"],
            match_explanation="Acyl Chloride + Amine",
            description="Formation of Amide.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="fischer_esterification",
            name="Fischer Esterification",
            curriculum_subsubject_id="esters",
            reaction_smarts="[C:1](=[O:2])[OH].[C:3][OH:4]>>[C:1](=[O:2])[O:4][C:3]",
            reactants_smarts=["[C](=[O])[OH]", "[C][OH]"],
            match_explanation="Carboxylic Acid + Alcohol + Acid",
            description="Reversible formation of Ester.",
            conditions=[set(["acid", "heat"]), set(["h2so4"])],
        )
    )

    registry.register(
        ReactionRule(
            id="saponification",
            name="Saponification",
            curriculum_subsubject_id="esters",
            reaction_smarts="[C:1](=[O:2])[O][C:3]>>[C:1](=[O:2])[O-].[C:3][OH]",
            reactants_smarts=["[C](=[O])[O][C]", "[OH-]"],
            match_explanation="Ester + Base (Hydroxide)",
            description="Basic hydrolysis to Carboxylate and Alcohol.",
            conditions=[set(["base"]), set(["oh-"])],
        )
    )

    # --- AROMATIC COMPOUNDS ---
    registry.register(
        ReactionRule(
            id="benzene_bromination",
            name="Bromination (EAS)",
            curriculum_subsubject_id="aromatics-halogenation",
            reaction_smarts=[
                "[Br][Br].[Fe](Br)(Br)Br>>[Br][Br+][Fe-](Br)(Br)Br",
                "[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[Br][Br+][Fe-](Br)(Br)Br>>[CH:1]1(Br)[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Fe-](Br)(Br)(Br)Br",
                "[CH]1(Br)[C+][CH]=[CH][CH]=[CH]1>>[C]1(Br)[C]=[CH][C+][CH]=[CH]1",
                "[C]1(Br)[C]=[CH][C+][CH]=[CH]1>>[C]1(Br)[CH]=[CH][CH]=[CH][C+]1",
                "[C]1(Br)[CH]=[CH][CH]=[CH][C+]1.[N]>>[c]1(Br)[cH][cH][cH][cH][cH]1.[N+]",
                "[N+].[Fe-](Br)(Br)(Br)Br>>[N].Br.[Fe](Br)(Br)Br",
            ],
            reactants_smarts=["[Br][Br]", "[c;H1]", "[Fe](Br)(Br)Br"],
            auto_add=["", "", "", "", "N"],
            match_explanation="Benzene + Br2 (FeBr3)",
            description="Electrophilic Aromatic Substitution: H replaced by Br.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="benzene_chlorination",
            name="Chlorination (EAS)",
            curriculum_subsubject_id="aromatics-halogenation",
            reaction_smarts=[
                "[Cl][Cl].[Fe](Cl)(Cl)Cl>>[Cl][Cl+][Fe-](Cl)(Cl)Cl",
                "[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[Cl][Cl+][Fe-](Cl)(Cl)Cl>>[CH:1]1(Cl)[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1.[Fe-](Cl)(Cl)(Cl)Cl",
                "[CH]1(Cl)[C+][CH]=[CH][CH]=[CH]1>>[C]1(Cl)[C]=[CH][C+][CH]=[CH]1",
                "[C]1(Cl)[C]=[CH][C+][CH]=[CH]1>>[C]1(Cl)[CH]=[CH][CH]=[CH][C+]1",
                "[C]1(Cl)[CH]=[CH][CH]=[CH][C+]1.[N]>>[c]1(Cl)[cH][cH][cH][cH][cH]1.[N+]",
                "[N+].[Fe-](Cl)(Cl)(Cl)Cl>>[N].Cl.[Fe](Cl)(Cl)Cl",
            ],
            reactants_smarts=["[c;H1]", "[Cl][Cl]", "[Fe](Cl)(Cl)Cl"],
            auto_add=["", "", "", "", "N"],
            match_explanation="Benzene + Cl2 (FeCl3)",
            description="Electrophilic Aromatic Substitution: H replaced by Cl.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="benzene_nitration",
            name="Nitration",
            curriculum_subsubject_id="aromatics-nitration",
            reaction_smarts=[
                "[N+](=O)([O-])[OH].[S](=O)(=O)([OH])[OH]>>[N+](=O)([O-])[O+H2].[S](=O)(=O)([O-])[OH]",
                "[N+](=O)([O-])[OH2].[S](=O)(=O)([O-])[OH]>>[N+](=O)=O.[S](=O)(=O)([O-])[OH].[OH2]",
                "[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[N+](=O)=O>>[CH:1]1([N+](=O)[O-])[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
                "[CH]1([N+](=O)[O-])[C+][CH]=[CH][CH]=[CH]1>>[C]1([N+](=O)[O-])[C]=[CH][C+][CH]=[CH]1",
                "[C]1([N+](=O)[O-])[C]=[CH][C+][CH]=[CH]1>>[C]1([N+](=O)[O-])[CH]=[CH][CH]=[CH][C+]1",
                "[C]1([N+](=O)[O-])[CH]=[CH][CH]=[CH][C+]1.[S](=O)(=O)([O-])[OH]>>[c]1([N+](=O)[O-])[cH][cH][cH][cH][cH]1.[S](=O)(=O)([OH])[OH]",
            ],
            reactants_smarts=["[c;H1]", "[N+](=O)([O-])O", "[S](=O)(=O)(O)O"],
            match_explanation="Benzene + HNO3 (H2SO4)",
            description="Electrophilic Aromatic Substitution: H replaced by Nitro group.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="benzene_sulfonation",
            name="Sulfonation",
            curriculum_subsubject_id="aromatics-sulfonation",
            reaction_smarts=[
                "[S](=O)(=O)([OH])[OH].[S](=O)(=O)([OH])[OH]>>[S](=O)(=O)([OH])[O+H2].[S](=O)(=O)([OH])[O-]",
                "[S](=O)(=O)([OH])[O+H2]>>[S+](=O)(=O)([OH]).[OH2]",
                "[cH:1]1[cH:2][cH:3][cH:4][cH:5][cH:6]1.[S+](=O)(=O)([OH])>>[CH:1]1([S](=O)(=O)([OH]))[C+:2][CH:3]=[CH:4][CH:5]=[CH:6]1",
                "[CH]1([S](=O)(=O)([OH]))[C+][CH]=[CH][CH]=[CH]1>>[C]1([S](=O)(=O)([OH]))[C]=[CH][C+][CH]=[CH]1",
                "[C]1([S](=O)(=O)([OH]))[C]=[CH][C+][CH]=[CH]1>>[C]1([S](=O)(=O)([OH]))[CH]=[CH][CH]=[CH][C+]1",
                "[C]1([S](=O)(=O)([OH]))[CH]=[CH][CH]=[CH][C+]1.[S](=O)(=O)([O-])[OH]>>[c]1([S](=O)(=O)([OH]))[cH][cH][cH][cH][cH]1.[S](=O)(=O)([OH])[OH]",
            ],
            reactants_smarts=["[c;H1]", "[S](=O)(=O)(O)O", "[S](=O)(=O)(O)O"],
            match_explanation="Benzene + SO3 (H2SO4)",
            description="Electrophilic Aromatic Substitution: H replaced by Sulfonic Acid.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="friedel_crafts_alkylation",
            name="Friedel-Crafts Alkylation",
            curriculum_subsubject_id="aromatics-fc-alkylation",
            reaction_smarts=[
                "[C:1][Cl].[Al](Cl)(Cl)Cl>>[C:1][Cl+][Al-](Cl)(Cl)Cl",
                "[C:1][Cl+][Al-](Cl)(Cl)Cl>>[C+:1].[Al-](Cl)(Cl)(Cl)Cl",
                "[cH:2]1[cH:3][cH:4][cH:5][cH:6][cH:7]1.[C+:1]>>[CH:2]1([C+0:1])[C+:3][CH:4]=[CH:5][CH:6]=[CH:7]1",
                "[CH]1([C:1])[C+][CH]=[CH][CH]=[CH]1>>[CH]1([C:1])[CH]=[CH][CH+][CH]=[CH]1",
                "[CH]1([C:1])[CH]=[CH][CH+][CH]=[CH]1>>[CH]1([C:1])[CH]=[CH][CH]=[CH][CH+]1",
                "[CH]1([C:1])[CH]=[CH][CH]=[CH][CH+]1.[Al-](Cl)(Cl)(Cl)Cl>>[c]1([C:1])[cH][cH][cH][cH][cH]1.[Al](Cl)(Cl)Cl.Cl",
            ],
            reactants_smarts=["[c;H1]", "[CX4][Cl]", "[Al](Cl)(Cl)Cl"],
            match_explanation="Benzene + Alkyl Chloride (AlCl3)",
            description="Alkylation of the aromatic ring. Rearrangements possible.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="friedel_crafts_acylation",
            name="Friedel-Crafts Acylation",
            curriculum_subsubject_id="aromatics-fc-acylation",
            reaction_smarts=[
                "[C:1](=[O:2])[Cl].[Al](Cl)(Cl)Cl>>[C:1](=[O:2])[Cl+][Al-](Cl)(Cl)Cl",
                "[C:1](=[O:2])[Cl+][Al-](Cl)(Cl)Cl>>[C+:1]=[O:2].[Al-](Cl)(Cl)(Cl)Cl",
                "[cH:3]1[cH:4][cH:5][cH:6][cH:7][cH:8]1.[C+:1]=[O:2]>>[CH:3]1([C+0:1]=[O:2])[C+:4][CH:5]=[CH:6][CH:7]=[CH:8]1",
                "[CH]1([C:1]=[O:2])[C+][CH]=[CH][CH]=[CH]1>>[CH]1([C:1]=[O:2])[CH]=[CH][CH+][CH]=[CH]1",
                "[CH]1([C:1]=[O:2])[CH]=[CH][CH+][CH]=[CH]1>>[CH]1([C:1]=[O:2])[CH]=[CH][CH]=[CH][CH+]1",
                "[CH]1([C:1]=[O:2])[CH]=[CH][CH]=[CH][CH+]1.[Al-](Cl)(Cl)(Cl)Cl>>[c]1([C:1]=[O:2])[cH][cH][cH][cH][cH]1.[Al](Cl)(Cl)Cl.Cl",
            ],
            reactants_smarts=["[c;H1]", "[C](=[O])[Cl]", "[Al](Cl)(Cl)Cl"],
            match_explanation="Benzene + Acyl Chloride (AlCl3)",
            description="Acylation of the aromatic ring (No rearrangement).",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="intramolecular_friedel_crafts_acylation_5",
            name="Intramolecular Friedel-Crafts (5-ring)",
            curriculum_subsubject_id="aromatics-fc-acylation",
            reaction_smarts="[c;H1:1]:[c:2]-[C:3]-[C:4]-[C:5](=[O:6])[Cl].[Al](Cl)(Cl)Cl>>[c:1]1:[c:2]-[C:3]-[C:4]-[C:5]1=[O:6].[Cl].[Al](Cl)(Cl)Cl",
            reactants_smarts=["[c;H1]:[c]-[C]-[C]-[C](=[O])[Cl]", "[Al](Cl)(Cl)Cl"],
            match_explanation="Intramolecular Acylation (5-ring)",
            description="Formation of 5-membered ring via intramolecular Friedel-Crafts Acylation.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="intramolecular_friedel_crafts_acylation_6",
            name="Intramolecular Friedel-Crafts (6-ring)",
            curriculum_subsubject_id="aromatics-fc-acylation",
            reaction_smarts="[c;H1:1]:[c:2]-[C:3]-[C:4]-[C:7]-[C:5](=[O:6])[Cl].[Al](Cl)(Cl)Cl>>[c:1]1:[c:2]-[C:3]-[C:4]-[C:7]-[C:5]1=[O:6].[Cl].[Al](Cl)(Cl)Cl",
            reactants_smarts=["[c;H1]:[c]-[C]-[C]-[C]-[C](=[O])[Cl]", "[Al](Cl)(Cl)Cl"],
            match_explanation="Intramolecular Acylation (6-ring)",
            description="Formation of 6-membered ring via intramolecular Friedel-Crafts Acylation.",
            conditions=[set()],
        )
    )

    # --- ALCOHOLS & ETHERS ---
    registry.register(
        ReactionRule(
            id="reduction_of_aldehyde_and_ketone_with_hydride_ion",
            name="Reduction of Aldehyde and Ketone with hydride ion",
            curriculum_subsubject_id="alcohols-preparation-reduction-carbonyls",
            reaction_smarts="[C:1](=[O:2]).[Na+].[BH4-].[OH3+]>>[C:1]([O:2])[H]",
            reactants_smarts=["[C](=[O])", "[Na+]", "[BH4-]", "[OH3+]"],
            match_explanation="Reduction of Aldehyde or Ketone with hydride ion",
            description="Reduction of Aldehyde or Ketone to Alcohol.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="ester_reduction_lialh4",
            name="Reduction of Ester with LiAlH4",
            curriculum_subsubject_id="alcohols-preparation-reduction-acids",
            reaction_smarts="[CX3:1](=[OX1:2])[OX2:3][#6:4].[Li+].[AlH4-].[OH3+]>>[C:1][OH:2].[#6:4][OH:3]",
            reactants_smarts=["[CX3](=[OX1])[OX2][#6]", "[Li+]", "[AlH4-]", "[OH3+]"],
            match_explanation="Reduction of Ester with LiAlH4",
            description="Reduction of Ester to Primary Alcohol and Alcohol.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="carboxylic_acids_with_hydride_ion",
            name="Reduction of Carboxylic Acid with Hydride Ion",
            curriculum_subsubject_id="alcohols-preparation-reduction-acids",
            reaction_smarts="[CX3:1](=[OX1:2])[OX2:3].[Li+].[AlH4-].[OH3+]>>[C:1][OH:2]",
            reactants_smarts=["[CX3](=[OX1])[OX2]", "[Li+]", "[AlH4-]", "[OH3+]"],
            match_explanation="Reduction of Carboxylic Acid with Hydride Ion",
            description="Reduction of Carboxylic Acid to Primary Alcohol.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="grignard_formation",
            name="Formation of Grignard Reagent",
            curriculum_subsubject_id="alcohols-grignard",
            reaction_smarts="[C:1][Cl,Br,I:2].[Mg].[C][C][O][C][C] >> [C:1][Mg][Cl,Br,I:2]",
            reactants_smarts=["[C][Cl,Br,I]", "[Mg]", "[C][C][O][C][C]"],
            match_explanation="Alkyl Halide + Mg",
            description="Formation of Grignard reagent from alkyl halide and magnesium metal.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="grignard_reaction_with_aldehyde",
            name="Aldehyde Grignard",
            curriculum_subsubject_id="alcohols-preparation-grignard",
            reaction_smarts=[
                "[C:1](=[O:2]).[C:3][Mg][Cl,Br,I] >> [C:1](-[C:3])(-[O:2]-[Mg]-[Cl,Br,I])",
                "[O:2]-[Mg]-[Cl,Br,I].[OH3+:4] >> [O:2]",
            ],
            reactants_smarts=["[C](=[O])", "[C][Mg][Cl,Br,I]"],
            auto_add=["", "[OH3+]"],
            match_explanation="Aldehyde Grignard",
            description="Aldehyde Grignard.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_activation_socl2",
            name="Activation with Thionyl Chloride",
            curriculum_subsubject_id="alcohols-activation-socl2",
            reaction_smarts="[C:1][OH].[S](=O)([Cl])[Cl] >> [C:1][Cl]",
            reactants_smarts=["[C;D1,D2][OH]", "[$([S](=O)(Cl)Cl)]"],
            match_explanation="Alcohol + SOCl2",
            description="Conversion to Alkyl Chloride (SN2).",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_activation_pbr3",
            name="Activation with PBr3",
            curriculum_subsubject_id="alcohols-activation-pbr3",
            reaction_smarts="[C:1][OH].[P](Br)(Br)Br >> [C:1][Br]",
            reactants_smarts=["[C;D1,D2][OH]", "[$([P](Br)(Br)Br)]"],
            match_explanation="Alcohol + PBr3",
            description="Conversion to Alkyl Bromide (SN2).",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_activation_pbcl",
            name="Activation with PCl3",
            curriculum_subsubject_id="alcohols-activation-pbcl",
            reaction_smarts="[C:1][OH].[P](Cl)(Cl)Cl >> [C:1][Cl]",
            reactants_smarts=["[C;D1,D2][OH]", "[$([P](Cl)(Cl)Cl)]"],
            match_explanation="Alcohol + PCl3",
            description="Conversion to Alkyl Chloride (SN2).",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_dehydration",
            name="Dehydration (E1)",
            curriculum_subsubject_id="alcohols-activation",
            reaction_smarts=[
                "[C:1][C:2][OH:3].[H+]>>[C:1][C:2][OH2+:3]",
                "[C:1][C:2][OH2+:3]>>[C:1][C+:2].[OH2:3]",
                "[C:1][C+:2]>>[C:1]=[C:2]",
            ],
            reactants_smarts=["[C][C][OH]", "[$([#1+]),$([S](=O)(=O))]"],
            match_explanation="Alcohol + Acid + Heat",
            description="Elimination of water to form an alkene.",
            conditions=[set(["heat"])],
        )
    )

    # registry.register(
    #     ReactionRule(
    #         id="alcohol_oxidation_jones",
    #         name="Oxidation (Jones)",
    #         curriculum_subsubject_id="alcohols-oxidation",
    #         reaction_smarts="[C;H2:1][OH]>>[C:1](=[O])[OH]",
    #         reactants_smarts=["[C;H2][OH]", "[S](=O)(=O)(O)O"],
    #         match_explanation="Primary Alcohol + Jones Reagent",
    #         description="Strong oxidation to Carboxylic Acid.",
    #         conditions=[set()],
    #     )
    # )

    registry.register(
        ReactionRule(
            id="alcohol_oxidation_pcc",
            name="Oxidation (PCC)",
            curriculum_subsubject_id="alcohols-oxidation",
            # Combined reaction SMARTS: [C;H1,H2] matches primary (H2) and secondary (H1) carbons
            reaction_smarts="[C;H1,H2:1][OH].[nH+]1ccccc1.[O-][Cr](Cl)(=O)=O>>[C:1]=[O]",
            reactants_smarts=[
                "[C;H1,H2][OH]",  # Primary or Secondary Alcohol
                "[nH+]1ccccc1",  # Pyridinium cation
                "[O-][Cr](Cl)(=O)=O",  # Chlorochromate anion
            ],
            match_explanation="Alcohol + PCC",
            description="Oxidation of primary alcohols to aldehydes and secondary alcohols to ketones.",
            conditions=[set()],
            block=True,
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_oxidation_h2cro4",
            name="Oxidation",
            curriculum_subsubject_id="alcohols-oxidation",
            reaction_smarts=[
                "[C;H2:1][OH].O[Cr](O)(=O)=O>>[C:1]=[O].O[Cr](O)(=O)=O",
                "[C:1]=[O]>>[C:1](=[O])[OH]",
            ],
            reactants_smarts=["[C;H2][OH]", "O[Cr](O)(=O)=O"],
            match_explanation="Alcohol + H2CRO4",
            description="Oxidation to carboxylic acid.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="alcohol_oxidation_h2cro4_2",
            name="Oxidation",
            curriculum_subsubject_id="alcohols-oxidation",
            reaction_smarts="[C;H1:1][OH].O[Cr](O)(=O)=O>>[C:1]=[O].O[Cr](O)(=O)=O",
            reactants_smarts=["[C;H1][OH]", "O[Cr](O)(=O)=O"],
            match_explanation="Alcohol + H2CRO4",
            description="Oxidation to carboxylic acid.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="williamson_ether_synthesis",
            name="Williamson Ether Synthesis",
            curriculum_subsubject_id="ethers-epoxides",
            reaction_smarts="[C:1][O-].[C:2][F,Cl,Br,I]>>[C:1][O][C:2].[F-,Cl-,Br-,I-]",
            reactants_smarts=["[C][O-]", "[C;D1][F,Cl,Br,I]"],
            match_explanation="Alkoxide + Alkyl Halide",
            description="SN2 formation of an ether.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="epoxide_creation",
            name="Epoxide Creation",
            curriculum_subsubject_id="ethers-epoxides",
            reaction_smarts=[
                "[O:1][C:2][C:3][Cl,Br,I:4].[Na]>>[O-:1][C:2][C:3][Cl,Br,I:4]",
                "[O-:1][C:2][C:3][Cl,Br,I:4]>>[O+0:1]1[C:2][C:3]1",
            ],
            reactants_smarts=["OCC[Cl,Br,I]", "[NaH]"],
            match_explanation="Alkoxide + Alkyl Halide",
            description="SN2 formation of an ether.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="epoxide_opening_acid",
            name="Epoxide Opening (Acid)",
            curriculum_subsubject_id="ethers-epoxides",
            reaction_smarts=[
                "[C:1]1[O:2][C:3]1.[H+]>>[C:1]1[O+:2][C:3]1",
                "[C:1]1[O+:2][C:3]1.[O:4]>>[C:1]([O:4])[C:3][O+0:2]",
            ],
            reactants_smarts=["[C]1[O][C]1", "[H+]", "[O]"],
            match_explanation="Epoxide + Acid + Nucleophile",
            description="Ring opening at the more substituted carbon.",
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][O;D2]", label="major"),
                    SelectivityRule(smarts="[C;D3][O;D2]", label="major"),
                    SelectivityRule(smarts="[C;D2][O;D2]", label="minor"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="epoxide_opening_basic",
            name="Epoxide Opening (Basic)",
            curriculum_subsubject_id="ethers-epoxides",
            reaction_smarts=[
                "[O-,N:4].[C;H2:1]1[O:2][C:3]1>>[O+0,N+:4][C:1][C:3][O-:2]",
                "[O-,N+:2].[H+]>>[O+0,N+0:2]",
            ],
            reactants_smarts=["[C]1[O][C]1", "[O-,N]"],
            match_explanation="Epoxide + Strong Nucleophile (Basic)",
            description="Attack at the less substituted carbon (Sterics).",
            auto_add=["", "[H+]"],
            conditions=[set()],
            selectivity=ReactionSelectivity(
                type="rank",
                rules=[
                    SelectivityRule(smarts="[C;D4][O:4]", label="minor"),
                    SelectivityRule(smarts="[C;D3][O:4]", label="minor"),
                    SelectivityRule(smarts="[C;D2][O:4]", label="major"),
                ],
            ),
        )
    )

    registry.register(
        ReactionRule(
            id="thiol_oxidation_disulfide",
            name="Oxidation to Disulfide",
            curriculum_subsubject_id="thiols-sulfides",
            reaction_smarts="[S;H1:1].[S;H1:2]>>[S:1][S:2]",
            reactants_smarts=["[S;H1]", "[S;H1]"],
            match_explanation="Thiol + Thiol (Oxidation)",
            description="Mild oxidation of thiols to form a disulfide.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="amine_protonation",
            name="Amine Protonation (Base)",
            curriculum_subsubject_id="amines-intro",
            reaction_smarts="[N;H3,H2,H1:1].[F,Cl,Br,I:2]>>[N+:1].[F,Cl,Br,I-:2]",
            reactants_smarts=["[N;H3,H2,H1]", "[F,Cl,Br,I][H]"],
            match_explanation="Amine + HX",
            description="Amine acts as a base, accepting a proton from an acid to form an ammonium salt.",
            conditions=[set()],
        )
    )

    registry.register(
        ReactionRule(
            id="elimination_substitution",
            name="Elimination Substitution",
            curriculum_subsubject_id="elimination-substitution",
            reaction_smarts="",  # Special handling
            reactants_smarts=["[CX4][F,Cl,Br,I,O]", "[*]"],
            match_explanation="Elimination Substitution",
            description="Elimination Substitution",
            conditions=[set(), set(["heat"])],
        )
    )

    registry.register(
        ReactionRule(
            id="intramolecular_substitution",
            name="Intramolecular Substitution",
            curriculum_subsubject_id="intramolecular-substitution",
            reaction_smarts="",  # Special handling
            reactants_smarts=["[CX4][F,Cl,Br,I]"],
            match_explanation="Intramolecular Substitution",
            description="Intramolecular Substitution",
            conditions=[set()],
        )
    )
