import { alkanes } from './curriculum/subjects/alkanes';
import { alkenes } from './curriculum/subjects/alkenes';
import { alkynes } from './curriculum/subjects/alkynes';
import { aromatics } from './curriculum/subjects/aromatics';
import { alcohols } from './curriculum/subjects/alcohols';
import { acidBase } from './curriculum/subjects/acid_base';
import { substitutionElimination } from './curriculum/subjects/substitution_elimination';
import { resonance } from './curriculum/subjects/resonance';
import { chirality } from './curriculum/subjects/chirality';
import { carboxylicAcids } from './curriculum/subjects/carboxylic_acids';
import { Subject } from './curriculum/types';

export * from './curriculum/types';

export const initialCurriculum: Subject[] = [
    alkanes,
    alkenes,
    alkynes,
    substitutionElimination,
    acidBase,
    chirality,
    resonance,
    aromatics,
    alcohols,
    carboxylicAcids
];
