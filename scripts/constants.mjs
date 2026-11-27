export const MODULE_ID = "campaign-calendar";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const DEFAULT_CONFIG = {
  name: "Campaign Calendar",
  yearLabel: "Year",
  defaultEra: "",
  months: [
    { name: "January", days: 31 },
    { name: "February", days: 28 },
    { name: "March", days: 31 },
    { name: "April", days: 30 },
    { name: "May", days: 31 },
    { name: "June", days: 30 },
    { name: "July", days: 31 },
    { name: "August", days: 31 },
    { name: "September", days: 30 },
    { name: "October", days: 31 },
    { name: "November", days: 30 },
    { name: "December", days: 31 }
  ]
};

export const DEFAULT_DATE = {
  year: 1,
  month: 0,
  day: 1,
  era: ""
};

export const DEFAULT_EVENTS = { items: [] };
export const DEFAULT_FACTIONS = { items: [] };
export const DEFAULT_MAPS = { items: [] };
export const DEFAULT_DOSSIERS = { items: [] };
export const DEFAULT_QUESTS = { items: [] };
