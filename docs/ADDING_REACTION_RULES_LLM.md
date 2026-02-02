# How to Add New Reaction Rules

This guide explains how to add new chemical reaction rules to the Organic Workbench. The system defines reactions statically in the frontend, which are then processed by the RDKit-based backend logic engine.

## 1. Core Definition
**File:** `frontend/src/services/reaction_definitions.ts`

This is the primary location for adding a new reaction. You need to add a `ReactionRule` object to the `reactionRules` array.

### Field Breakdown

```typescript
export interface ReactionRule {
    // Unique identifier (e.g., 'alkene_hydrohalogenation')
    id: string 

    // Human-readable name shown in the UI
    name: string 

    // The subsubject ID from the curriculum that teaches this reaction
    // (See src/data/curriculum/subjects/*.ts)
    curriculum_subsubject_id: string 

    // The core transformation logic using SMARTS.
    // Can be a single string for 1-step, or an array for multi-step mechanisms.
    reactionSmarts: string | string[] 

    // SMARTS patterns to identify the required reactants (e.g., ['[C]=[C]', '[Br][Br]'])
    reactantsSmarts: string[] 

    // Valid conditions required for this reaction (e.g., 'light', 'heat', 'cold', 'pd_c').
    // Use `or('light', 'heat')` for alternatives. Use `[new Set()]` for no conditions.
    conditions: Set<string>[] 

    // (Optional) Explanation shown when this reaction matches a user's input
    matchExplanation?: string 

    // (Optional) Auto-add specific molecules at certain steps
    // Useful for adding water or oxidizing agents that "appear" in the mechanism
    autoAdd?: (string | Record<string, never>)[] 

    // (Optional) Regioselectivity rules
    selectivity?: {
        type: 'rank' | 'explicit',
        rules: { 
            smarts: string; // The product pattern to match
            label: 'major' | 'minor' | 'trace' | 'equal' 
        }[]
    }

    // (Optional) Priority ranking. Higher number = Major product pathway when competing.
    // Default is 1. Standard reaction is typically 20.
    rank?: number 
    
    // (Optional) ID of another reaction to append to this one. 
    // This chains the Logic (SMARTS) of the appended reaction to this one.
    append_reaction?: string
}
```

### Example: Alkene Hydrohalogenation
```typescript
{
    id: 'alkene_hydrohalogenation',
    name: 'Hydrohalogenation (HX)',
    rank: 20,
    curriculum_subsubject_id: 'alkenes-hydrohalogenation',
    // Two-step mechanism: Protonation then Nucleophilic Attack
    reactionSmarts: [
        '[C:1]=[C:2].[F,Cl,Br,I:3]>>[C:1][C+:2].[F-,Cl-,Br-,I-:3]', 
        '[C+:1].[F-,Cl-,Br-,I-:2]>>[C+0:1][*+0:2]' 
    ],
    reactantsSmarts: ['[C]=[C]', '[F,Cl,Br,I]'], 
    description: 'Addition of H-X across a double bond (Markovnikov).',
    conditions: [new Set()], // No special conditions
    selectivity: {
        type: 'rank',
        rules: [
            { smarts: '[C;D4][F,Cl,Br,I]', label: 'major' }, // Tertiary
            { smarts: '[C;D3][F,Cl,Br,I]', label: 'major' }, // Secondary
            { smarts: '[C;D2][F,Cl,Br,I]', label: 'minor' }  // Primary
        ]
    }
}
```

## 2. Advanced Features

### Multi-Step Mechanisms
If a reaction proceeds through intermediates (like a carbocation), define `reactionSmarts` as an array of strings. The backend will execute them sequentially.
*   **Debug Mode**: Users can see each step if they run the reaction in "Debug" mode.
*   **Carbocations**: If an intermediate contains a C+, the backend automatically checks for rearrangements (hydride/methyl shifts) before the next step.

### Auto-Add Reagents
Sometimes a step requires a reagent that wasn't in the initial pot (e.g., water in the second step of oxidation).
Use `autoAdd`:
```typescript
// Step 0: Normal
// Step 1: Add water (O) and hydroxide ([OH-]) to the mixture
autoAdd: ['', 'O.[OH-]'] 
```

### Selectivity (Markovnikov / Zaitsev)
The `selectivity` field helps the UI label products as "Major" or "Minor".
*   **Rules**: List SMARTS patterns for the *products*.
*   **Order**: The system checks rules in order. The first match determines the label.

## 3. Validation
1.  **Frontend**: The TypeScript compiler will ensure your `ReactionRule` object is valid.
2.  **Runtime**: Use the **Reaction Debug Panel** in the app.
    *   Select your reaction.
    *   Draw the reactants.
    *   Click "Run Debug" to see the step-by-step mechanism and verify your SMARTS patterns.

## 4. Updates
If you add a new condition (e.g., a specific catalyst), update:
*   `frontend/src/data/conditions.ts`: Add the condition ID and display name.
