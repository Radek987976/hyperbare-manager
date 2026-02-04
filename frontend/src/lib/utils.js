import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date to French locale
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format datetime to French locale
export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status labels in French
export const statusLabels = {
  en_service: 'En service',
  maintenance: 'En maintenance',
  hors_service: 'Hors service',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée'
};

// Priority labels in French
export const priorityLabels = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse'
};

// Criticality labels in French
export const criticiteLabels = {
  critique: 'Critique',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse'
};

// Equipment type labels
export const equipmentTypeLabels = {
  porte: 'Porte',
  joint: 'Joint',
  soupape: 'Soupape',
  compresseur: 'Compresseur',
  capteur: 'Capteur',
  systeme_securite: 'Système de sécurité'
};

// Maintenance type labels
export const maintenanceTypeLabels = {
  preventive: 'Préventive',
  corrective: 'Corrective'
};

// Periodicity labels
export const periodiciteLabels = {
  hebdomadaire: 'Hebdomadaire (7 jours)',
  mensuel: 'Mensuel (1 mois)',
  trimestriel: 'Trimestriel (3 mois)',
  semestriel: 'Semestriel (6 mois)',
  annuel: 'Annuel (1 an)',
  biannuel: 'Biannuel (2 ans)',
  triennal: 'Triennal (3 ans)',
  quinquennal: 'Quinquennal (5 ans)',
  decennal: 'Décennal (10 ans)'
};

// Get status class for styling
export function getStatusClass(status) {
  const classes = {
    en_service: 'status-en_service',
    maintenance: 'status-maintenance',
    hors_service: 'status-hors_service',
    planifiee: 'bg-blue-100 text-blue-800 border border-blue-200',
    en_cours: 'bg-amber-100 text-amber-800 border border-amber-200',
    terminee: 'bg-green-100 text-green-800 border border-green-200',
    annulee: 'bg-gray-100 text-gray-600 border border-gray-200'
  };
  return classes[status] || 'bg-gray-100 text-gray-600';
}

// Get priority class for styling
export function getPriorityClass(priority) {
  const classes = {
    urgente: 'priority-urgente',
    haute: 'priority-haute',
    normale: 'priority-normale',
    basse: 'priority-basse'
  };
  return classes[priority] || 'bg-gray-400 text-white';
}

// Get criticality class for styling
export function getCriticiteClass(criticite) {
  const classes = {
    critique: 'criticite-critique',
    haute: 'criticite-haute',
    normale: 'criticite-normale',
    basse: 'criticite-basse'
  };
  return classes[criticite] || 'bg-gray-100 text-gray-600';
}

// Download blob as file
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Calculate days until date
export function daysUntil(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = date - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
