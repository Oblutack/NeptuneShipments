import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

interface PreferencesState {
  units: "METRIC" | "IMPERIAL";
  notificationsEnabled: boolean;
}

// Load from localStorage on init
const loadPreferences = (): PreferencesState => {
  try {
    const stored = localStorage.getItem("neptune_preferences");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load preferences:", error);
  }
  return {
    units: "METRIC",
    notificationsEnabled: true,
  };
};

// Save to localStorage
const savePreferences = (state: PreferencesState) => {
  try {
    localStorage.setItem("neptune_preferences", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save preferences:", error);
  }
};

const initialState: PreferencesState = loadPreferences();

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    toggleUnits: (state) => {
      state.units = state.units === "METRIC" ? "IMPERIAL" : "METRIC";
      savePreferences(state);
    },
    toggleNotifications: (state) => {
      state.notificationsEnabled = !state.notificationsEnabled;
      savePreferences(state);
    },
    setUnits: (state, action: PayloadAction<"METRIC" | "IMPERIAL">) => {
      state.units = action.payload;
      savePreferences(state);
    },
  },
});

export const { toggleUnits, toggleNotifications, setUnits } =
  preferencesSlice.actions;

// Selectors
export const selectPreferences = (state: RootState) => state.preferences;
export const selectUnits = (state: RootState) => state.preferences.units;
export const selectNotificationsEnabled = (state: RootState) =>
  state.preferences.notificationsEnabled;

export default preferencesSlice.reducer;
