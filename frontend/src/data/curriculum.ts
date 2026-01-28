import { alkanes } from './curriculum/subjects/alkanes';
import { alkenes } from './curriculum/subjects/alkenes';
import { alkynes } from './curriculum/subjects/alkynes';
import { Subject } from './curriculum/types';

export * from './curriculum/types';

export const initialCurriculum: Subject[] = [
    alkanes,
    alkenes,
    alkynes
];
