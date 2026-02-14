import { describe, it, expect, beforeAll } from 'vitest';
import { compareAcids } from './acidBase';
import { rdkitService } from './rdkit';

describe('Acid comparison rules', () => {
    beforeAll(async () => {
        await rdkitService.initialize();
    }, 20000);

    it ('F,O', () => {
        const result = compareAcids('F', 'O');
        expect(result.winner).toBe('A');
    });

    it ('ClF', () => {
        const result = compareAcids('Cl', 'F');
        expect(result.winner).toBe('A');
    });

    it ('Br,Cl', () => {
        const result = compareAcids('Br', 'Cl');
        expect(result.winner).toBe('A');
    });

    it ('I,Br', () => {
        const result = compareAcids('I', 'Br');
        expect(result.winner).toBe('A');
    });

    it ('compares identical acids and returns a tie', () => {
        const result = compareAcids('CC(=O)O', 'CC(=O)O');
        expect(result.winner).toBe('tie');
    });

    it ('C=C,CC', () => {
        const result = compareAcids('C=C', 'CC');
        expect(result.winner).toBe('A'); 
    });

    it ('C#C,C=C', () => {
        const result = compareAcids('C#C', 'C=C');
        expect(result.winner).toBe('A'); 
    });
    
    it ('C(C(O)=O)Br,CC(=O)O', () => {
        const result = compareAcids('C(C(O)=O)Br', 'CC(=O)O');
        expect(result.winner).toBe('A');
    });

    it ('C(C(O)=O)Cl,C(C(O)=O)Br', () => {
        const result = compareAcids('C(C(O)=O)Cl', 'C(C(O)=O)Br');
        expect(result.winner).toBe('A');
    });

    it ('C(C(O)=O)F,C(C(O)=O)Cl', () => {
        const result = compareAcids('C(C(O)=O)F', 'C(C(O)=O)Cl');
        expect(result.winner).toBe('A');
    });


    it ('C(CCC)(C(O)=O)F,C(C(=O)O)C(F)CC', () => {
        const result = compareAcids('C(CCC)(C(O)=O)F', 'C(C(=O)O)C(F)CC');
        expect(result.winner).toBe('A');
    });

    it ('C(C(=O)O)C(F)CC,C(C(=O)O)CC(F)C', () => {
        const result = compareAcids('C(C(=O)O)C(F)CC', 'C(C(=O)O)CC(F)C');
        expect(result.winner).toBe('A');
    });

    it ('C(C(=O)O)CC(F)C,C(C(=O)O)CCCF', () => {
        const result = compareAcids('C(C(=O)O)CC(F)C', 'C(C(=O)O)CCCF');
        expect(result.winner).toBe('A');
    });

    it ('CCC(=O)O,CCCO', () => {
        const result = compareAcids('CCC(=O)O', 'CCCO');
        expect(result.winner).toBe('A');
    });
});
