# How to Add New Nomenclature Rules (e.g., Alcohols, Ketones, etc.)

This guide summarizes the steps required to add support for a new functional group or nomenclature rule to the Organic Logic Workbench.

## 1. Update the Curriculum Data
**File:** `src/data/curriculum.ts`

1.  **Add a New `Subject` or `SubSubject`**:
    *   Create a new entry in `initialCurriculum`.
    *   Add educational content (`content`) using Markdown.
    *   Add `examples` (SMILES and correct IUPAC names).

2.  **Define Rules**:
    *   Add `Rule` objects to the `rules` array of your subject.
    *   Assign a unique `id` and a specific `logicType`.
    *   **Note**: `logicType` is the key string the Logic Engine uses to decide which code to run.

    ```typescript
    // Example for Alcohols
    {
        id: 'rule_alcohol_suffix',
        name: 'Alcohol Suffix',
        description: 'Change the parent suffix to -ol.',
        logicType: 'check_suffix_alcohol', // NEW TYPE
        unlocked: true
    }
    ```

3.  **Update Types**:
    *   Add your new `logicType` string to the `RuleLogicType` union type at the top of the file.

## 2. Update the Logic Engine
**File:** `src/services/logicEngine.ts`

The `LogicEngine` analyzes the molecule graph and generates the name. You typically need to touch three main areas:

### A. Detection (Topology Analysis)
*   **Where**: `determineParentStructure(ctx)` or `analyzeSubstituents(ctx)`
*   **Task**: Identify the functional group in the graph (e.g., Oxygen bonded to Carbon with H).
*   **Logic**:
    1.  Use `ctx.graph` to find the atoms.
    2.  Store the detected groups in the context (e.g., `ctx.functionalGroups`).
    3.  **Priority**: Ensure the new group takes precedence over existing ones (e.g., OH > Double Bond > Single Bond) when selecting the Parent Chain.

### B. Numbering
*   **Where**: `determineNumbering(ctx)`
*   **Task**: Ensure the new group gets the lowest possible locant.
*   **Logic**:
    1.  Update the `Scheme` logic to track the new group's position.
    2.  Update the sorting/comparison logic (`comparer`) to prioritize this group above others (e.g., OH locant < Double Bond locant).

### C. Name Assembly
*   **Where**: `assembleName(ctx)`
*   **Task**: Construct the final string.
*   **Logic**:
    1.  **Suffix**: Change the root suffix (e.g., `Pentane` -> `Pentanol`).
    2.  **Infix**: Handle cases like `Pent-2-en-1-ol`.
    3.  **Prefix**: If the group is a substituent (lower priority), add it to `substituentParts` (e.g., `Hydroxy-`).

## 3. Validation & Testing
1.  **Cheatsheet**: Update `src/components/Cheatsheet.tsx` if there are new priorities or suffixes to list.
2.  **Test**: Add the examples defined in the curriculum to `src/services/test_suite.ts` or run the workbench to verify the logic generates the correct name.
