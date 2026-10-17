// Real UN/IMO Dangerous Goods classes (IMDG Code) - the 9 classes are a
// genuine international classification, not invented for this app.
export const IMDG_CLASSES: Record<string, string> = {
  "1": "Explosives",
  "2": "Gases",
  "3": "Flammable Liquids",
  "4": "Flammable Solids",
  "5": "Oxidizing Substances",
  "6": "Toxic & Infectious Substances",
  "7": "Radioactive Material",
  "8": "Corrosive Substances",
  "9": "Miscellaneous Dangerous Goods",
};

export function imdgLabel(imdgClass: string): string {
  return `Class ${imdgClass} - ${IMDG_CLASSES[imdgClass] ?? "Dangerous Goods"}`;
}
