import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rdkitService } from './rdkit';

describe('Reaction Execution', () => {
    beforeEach(async () => {
        await rdkitService.initialize()
    });
    const reactents_and_products = [
        {
            reactant: 'C.ClCl',
            expectedProduct: 'ClC',
            smarts: '[C;H1,H2,H3:1]>>[C:1][Cl]'
        },
        {
            reactant: 'CCC.BrBr',
            expectedProduct: 'CCCBr',
            smarts: '[C;H1,H2,H3:1]>>[C:1][Br]'
        }
    ]
    reactents_and_products.forEach(({ reactant, expectedProduct, smarts }) => {
        it(`correctly names ${reactant}`, async () => {
            // Mocking the backend response since we are in a unit test environment
            vi.spyOn(rdkitService, 'runReaction').mockResolvedValue({ products: [expectedProduct], byproducts: [] });

            const results = await rdkitService.runReaction([reactant], smarts) as any;
            expect(results.products).toContain(expectedProduct);
        });
    });

});
