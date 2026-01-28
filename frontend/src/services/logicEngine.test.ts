import { describe, it, expect, beforeEach } from 'vitest';
import { LogicEngine } from './logicEngine';
import { ALL_RULES } from '../data/allRules';
import { rdkitService } from './rdkit';

describe('LogicEngine IUPAC Rules', () => {

    beforeEach(async () => {
        await rdkitService.initialize()
    });

    const alkanes = {
        // Basic Straight-Chain Alkanes
        "C": "Methane",
        "CC": "Ethane",
        "CCC": "Propane",
        "CCCC": "Butane",
        "CCCCC": "Pentane",
        "CCCCCC": "Hexane",
        "CCCCCCC": "Heptane",
        "CCCCCCCC": "Octane",
        "CCCCCCCCC": "Nonane",
        "CCCCCCCCCC": "Decane",

        // Constitutional Isomers & Branched Alkanes
        "CC(C)C": "Isobutane or 2-methylpropane",
        "CC(C)CC": "Isopentane or 2-methylbutane",
        "CC(C)(C)C": "2,2-Dimethylpropane",
        "CC(C)CCC": "2-Methylpentane",
        "CCCC(CC)CC": "3-Ethylhexane",
        "CCC(C)CC": "3-Methylpentane",
        "CCC(CC)CC(C)CC": "3-Ethyl-5-MethylHeptane",
        "CC(C)C(C)C": "2,3-Dimethylbutane",
        "CC(C)(C)CC": "2,2-Dimethylbutane",
        "CC(C)(C)CC(C)C": "2,2,4-Trimethylpentane",
        "CCC(CC(C(C)CC)C)CC": "6-Ethyl-3,4-dimethyloctane",
        "CCCC(CCC)CCCC": "4-Propyloctane",
        "CCC(C)CC(CC)CCC": "5-Ethyl-3-methyloctane",
        "CC(CC(CC)C)C": "2,4-Dimethylhexane",
        "CC(C)CCC(CC)(C)CC": "5-Ethyl-2,5-dimethylheptane",
        "CCC(CC)(CC)CCC(CC)C(C)CCC": "3,3,6-Triethyl-7-methyldecane",
        "CC(C)CCC(CC)CCC": "5-Ethyl-2-methyloctane",
        "CCCC(C(C)C)CCC": "4-Isopropylheptane or 4-(1-methylethyl)heptane",
        "CCCCCC(CC(C)C)CCCC": "5-Isobutyldecane or 5-(2-methylpropyl)decane",
        "CCC(CC)CC(C(C)(C)C)CCC": "5-tert-Butyl-3-ethyloctane or 5-(1,1-dimethylethyl)-3-ethyloctane",

        // Halides
        "CCCCCCBr": "1-Bromohexane",
        "CC(C)C(Br)CC": "3-Bromo-2-methylpentane",
        "CC(Br)C(Cl)C": "2-Bromo-3-chlorobutane",

        // Cycloalkanes
        "C1CC1": "Cyclopropane",
        "C1CCC1": "Cyclobutane",
        "C1CCCC1": "Cyclopentane",
        "C1CCCCC1": "Cyclohexane",
        "C1CCCCCC1": "Cycloheptane",
        "C1CCCCCCC1": "Cyclooctane",
        "C1(C)CCCCC1": "Methylcyclohexane",
        "C1(C2CC2)CCCC1": "Cyclopropylcyclopentane",
        "C1(C)CCCC(C)C1": "1,3-Dimethylcyclohexane",
    };

    Object.entries(alkanes).forEach(([smile, expectedName]) => {
        it(`correctly names ${smile}`, () => {
            const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
            expect((res.name as string).toLowerCase()).toBe(expectedName.toLowerCase());
            expect(res.isValid).toBe(true);
        });
    });

    const alkenes = {
        "C=C": "Ethene",
        "CC=C": "Propene",
        "CCC=C": "Butene",
        "CCCC=C": "Pentene",
        "CCCCC=C": "Hexene",
        "CCCCCC=C": "Heptene",
        "CCCCCCC=C": "Octene",
        "CCCCCCCC=C": "Nonene",
        "CCCCCCCCC=C": "Decene",
        "CCCCCCCCCC=C": "Undecene",
        "CC=CC": "2-Butene",
        "CCC=CC": "2-Pentene",
        "CCC=CCC": "3-Hexene",
        "CCCC=CCC": "3-Heptene",
        "CCCC=CCCC": "4-Octene",
        "CCCCC=CCCC": "4-Nonene",
        "CCCCC=CCCCC": "5-Decene",
        "CC=CCCCCCCC": "2-Decene",
        "CCC=CCCCCCC": "3-Decene",
        "CCCC=CCCCCC": "4-Decene",
        "C1=CC1": "Cyclopropene",
        "C1=CCC1": "Cyclobutene",
        "C1=CCCC1": "Cyclopentene",
        "C1=CCCCC1": "Cyclohexene",
        "C1=CCCCCC1": "Cycloheptene",
        "C1=CCCCCCC1": "Cyclooctene",
        "C1=CCCCCCCC1": "Cyclononene",
        "C1=CCCCCCCCC1": "Cyclodecene",

        "C/C=C/C(C)C": "4-methylpent-2-ene",
        "C/C(/CC)=C/CCC": "3-methylhept-3-ene",
        "C/C(/C)=C/C=C": "4-methylpenta-1,3-diene",
        "CC/C(/C)=C/CC(CC)CC": "6-ethyl-3-methyloct-3-ene",
        "CCC(Br)C(Cl)CC=C": "5-bromo-4-chlorohept-1-ene",
        "C/C=C/C=C/CC": "hepta-2,4-diene",
        "C=C/C=C/C": "penta-1,3-diene",
        "C=C/C=C/C=C": "hexa-1,3,5-triene",
        "C1C(CC)CCC=1": "3-ethylcyclopentene",
        "C1=CCC(C)C(C)C1": "4,5-dimethylcyclohexene",
        "C1CCC(CC)C(C)C=1": "4-ethyl-3-methylcyclohexene",
        "C1CCCC(Cl)C=1Cl": "1,6-dichlorocyclohexene",
        "C1CCC(CC)CC=1C": "5-ethyl-1-methylcyclohexene",

    };
    Object.entries(alkenes).forEach(([smile, expectedName]) => {
        it(`correctly names ${smile}`, () => {
            const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
            expect((res.name as string).toLowerCase()).toBe(expectedName.toLowerCase());
            expect(res.isValid).toBe(true);
        });
    });

    const alkynes = {
        "C#C": "Ethyne",
        "CC#C": "Propyne",
        "CCC#C": "Butyne",
        "CCCC#C": "Pentyne",
        "CCCCC#C": "Hexyne",
        "CCCCCC#C": "Heptyne",
        "CCCCCCC#C": "Octyne",
        "CCCCCCCC#C": "Nonyne",
        "CCCCCCCCC#C": "Decyne",

        "CC#CCC": "Pent-2-yne",
        "CCC#CCC": "Hex-3-yne",
        "CC#CCCC": "Hex-2-yne",
        "CCCC#CCC": "Hept-3-yne",
        "CCCC#CCCC": "Oct-4-yne",
        "CC(CC)C#CC": "4-methylhex-2-yne",
        "CC(Cl)C(Br)C#CCCC": "3-Bromo-2-Chlorooct-4-yne",
        "CC(C)C#CCCBr": "1-bromo-5-methylhex-3-yne",
        "C/C=C/CCC#C": "hept-5-en-1-yne",
        "C=CCCC#CC": "hept-1-en-5-yne",
        "C=CC(CCCC)C#CC": "3-butylhex-1-en-4-yne",

    };

    Object.entries(alkynes).forEach(([smile, expectedName]) => {
        it(`correctly names ${smile}`, () => {
            const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
            expect((res.name as string).toLowerCase()).toBe(expectedName.toLowerCase());
            expect(res.isValid).toBe(true);
        });
    });

});
