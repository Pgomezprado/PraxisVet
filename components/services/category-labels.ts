import type { ServiceCategory } from "@/types";

export const categoryLabels: Record<ServiceCategory, string> = {
  consultation: "Consulta",
  surgery: "Cirugia",
  grooming: "Estetica",
  vaccine: "Vacuna",
  lab: "Laboratorio",
  imaging: "Imagenologia",
  other: "Otro",
};

export const categoryColors: Record<ServiceCategory, string> = {
  consultation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  surgery: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  grooming: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  vaccine: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  lab: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  imaging: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export const categoryOptions = [
  { value: "consultation", label: "Consulta" },
  { value: "surgery", label: "Cirugia" },
  { value: "grooming", label: "Estetica" },
  { value: "vaccine", label: "Vacuna" },
  { value: "lab", label: "Laboratorio" },
  { value: "imaging", label: "Imagenologia" },
  { value: "other", label: "Otro" },
] as const;
