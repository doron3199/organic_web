import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { LogicEngine } from './logicEngine';
import { ALL_RULES } from '../data/allRules';
import { rdkitService } from './rdkit';

describe('LogicEngine IUPAC Rules', () => {

    beforeEach(async () => {
        await rdkitService.initialize()
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });



    // invalid_smiles = {
    //     "C1CCCCC1C2CC2": "Cyclopropylcyclohexane",
    //     "CC1CCCC1C": "1,2-Dimethylcyclopentane",
    // }

    // valid_smiles.forEach((smile, expected_name) => {
    //     it(`correctly names ${smile}`, () => {
    //         const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
    //         expect(res.name).toBe(expected_name);
    //         expect(res.isValid).toBe(true);
    //     });
    // });
    const valid_smiles = {
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

    Object.entries(valid_smiles).forEach(([smile, expectedName]) => {
        it(`correctly names ${smile}`, () => {
            const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
            expect((res.name as string).toLowerCase()).toBe(expectedName.toLowerCase());
            expect(res.isValid).toBe(true);
        });
    });

    // it('correctly name alkanes', () => {

    //     Object.entries(valid_smiles).forEach(([smile, expectedName]) => {
    //         const res = LogicEngine.analyzeMolecule(smile, ALL_RULES);
    //         expect(res.name).toBe(expectedName);
    //         expect(res.isValid).toBe(true);
    //     });
    // });


    // it('correctly names a simple alkane (Pentane)', () => {
    //     const res = LogicEngine.analyzeMolecule("CCCCC", ALL_RULES);
    //     expect(res.name).toBe('Pentane');
    //     expect(res.isValid).toBe(true);
    // });

    // it('correctly names 2-Chloropentane (Halogen Rule)', () => {
    //     const res = LogicEngine.analyzeMolecule("CC(Cl)CCC", ALL_RULES);
    //     expect(res.name).toBe('2-Chloropentane');
    // });

    // it('correctly handles lowest locants (2-Methylpentane vs 4-Methylpentane)', () => {
    //     const res = LogicEngine.analyzeMolecule("CC(C)CCC", ALL_RULES);
    //     expect(res.name).toBe('2-Methylpentane');
    // });

    // it('correctly orders substituents alphabetically (2-Bromo-3-chlorobutane)', () => {

    //     const res = LogicEngine.analyzeMolecule("CC(Br)C(Cl)C", ALL_RULES);
    //     expect(res.name).toBe('2-Bromo-3-chlorobutane');
    // });

    // it('correctly names Cyclopropylcyclohexane (Ring Rule)', () => {

    //     const res = LogicEngine.analyzeMolecule("C1CCCCC1C2CC2", ALL_RULES);
    //     expect(res.name).toBe('Cyclopropylcyclohexane');
    // });

    // it('names 1,2-Dimethylcyclopentane with lowest locants', () => {

    //     const res = LogicEngine.analyzeMolecule("CC1CCCC1C", ALL_RULES);
    //     expect(res.name).toBe('1,2-Dimethylcyclopentane');
    // });

});
