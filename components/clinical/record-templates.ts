export interface RecordTemplate {
  name: string;
  reason: string;
  symptoms: string;
  diagnosis: string;
  treatment: string;
  observations?: string;
}

export const RECORD_TEMPLATES: RecordTemplate[] = [
  {
    name: "Consulta general",
    reason: "Control general",
    symptoms: "",
    diagnosis: "",
    treatment: "",
  },
  {
    name: "Vacunacion",
    reason: "Aplicacion de vacuna",
    symptoms: "Sin signos clinicos aparentes",
    diagnosis: "Paciente apto para vacunacion",
    treatment: "Se aplica vacuna segun protocolo",
  },
  {
    name: "Urgencia",
    reason: "",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    observations: "",
  },
  {
    name: "Control post-quirurgico",
    reason: "Control post-operatorio",
    symptoms: "",
    diagnosis: "Evolucion post-quirurgica",
    treatment: "Continuar con medicacion indicada",
  },
  {
    name: "Desparasitacion",
    reason: "Desparasitacion",
    symptoms: "Sin signos clinicos aparentes",
    diagnosis: "Paciente apto para desparasitacion",
    treatment: "Se administra antiparasitario segun peso",
  },
];
