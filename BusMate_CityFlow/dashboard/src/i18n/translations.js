export const translations = {
  en: {
    appName: 'CityFlow',
    campusSeat: 'CampusSeat',
    overview: 'Overview',
    frequencyPlan: 'Frequency plan',
    forecast: 'Forecast',
    planComparison: 'Plan comparison',
    modelData: 'Model & data',
    comparison: 'Model comparison',
    current: 'Compare with current',
    accessibility: 'Accessibility',
    honesty: 'Observed ridership from a public dataset (UrbanBus, Jan-Mar 2018, anonymised city), mapped to Pune corridor names by a stated rule. Not measured Pune ridership. Crowding, waiting and cost are computed from assumed capacity and weights.',
    scenarioMapped: 'scenario-mapped',
    source: 'Source',
    loading: 'Loading dashboard data',
    dataError: 'Dashboard data could not be loaded. Refresh to try again.',
    languageNote: 'Hindi and Marathi translations are pending; this dashboard currently displays English.',
    footerNote: 'Scenario planning prototype · assumptions shown with results',
    showTable: 'Show data table',
    hideTable: 'Hide data table',
  },
  hi: {},
  mr: {},
}

export const pendingTranslations = Object.keys(translations.en)

export function translate(language, key) {
  return translations[language]?.[key] || translations.en[key] || key
}
