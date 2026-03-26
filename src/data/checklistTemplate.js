export const WORKBOOK_SUMMARY = {
  fileName: 'Checklist_Qualite_Beton_Precontraint.xlsx',
  sheetCount: 3,
  totalControls: 30,
}

export const CHECKLIST_SECTIONS = [
  {
    id: 'production',
    title: 'Production',
    shortTitle: 'Production',
    accent: '#38bdf8',
    description: 'Contrôles atelier et exécution sur ligne de fabrication.',
    items: [
      'Matières premières conformes',
      'Humidité sable contrôlée',
      'Acier conforme (certificat, diamètre)',
      'Tension appliquée conforme',
      'Moules propres et préparés',
      'Positionnement des fils correct',
      'Formule béton respectée',
      'Consistance béton conforme',
      'Cycle étuvage respecté',
      'Détension progressive',
      'Absence de fissures après démoulage',
      'Identification produit conforme',
    ],
  },
  {
    id: 'assurance-qualite',
    title: 'Assurance Qualité',
    shortTitle: 'Assurance',
    accent: '#a78bfa',
    description: 'Pilotage qualité, traçabilité, procédures et amélioration continue.',
    items: [
      'Procédures disponibles et à jour',
      'Traçabilité des lots assurée',
      'Enregistrements production complets',
      'Personnel formé',
      'Maintenance réalisée',
      'Équipements étalonnés',
      'Gestion des non-conformités',
      'Actions correctives suivies',
      'Audit interne réalisé',
    ],
  },
  {
    id: 'controle-qualite',
    title: 'Contrôle Qualité',
    shortTitle: 'Contrôle',
    accent: '#f97316',
    description: 'Essais, validation produit, mesures et contrôles avant livraison.',
    items: [
      'Contrôle granulats effectué',
      'Contrôle béton frais (consistance)',
      'Essais compression réalisés',
      'Résistance décoffrage atteinte',
      'Contrôle effort précontrainte',
      'Contrôle dimensions produit',
      'Contrôle visuel (fissures)',
      'Essai de flexion réalisé',
      'Validation avant livraison',
    ],
  },
]

export function createChecklistItems() {
  return CHECKLIST_SECTIONS.flatMap((section) =>
    section.items.map((point, index) => ({
      id: `${section.id}-${index + 1}`,
      sectionId: section.id,
      sectionTitle: section.title,
      number: String(index + 1),
      point,
      status: 'pending',
      comment: '',
      actionPlan: '',
      lastUpdated: null,
    })),
  )
}
