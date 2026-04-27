/**
 * Re-export del shape que devuelven las Server Actions de exámenes.
 * Mantenemos un alias estable aquí para que los componentes UI no se acoplen
 * al path largo de la action.
 */
export type { ExamWithRelations as ExamWithPeople } from "@/app/[clinic]/clients/[id]/pets/[petId]/exams/actions";
