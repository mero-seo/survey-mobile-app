import React, { createContext, useContext, useEffect, useReducer } from "react";
import { DeviceConfig } from "../services/configStorage";
import { SurveyRow } from "../services/surveyStorage";

// State types
interface SurveyState {
  surveys: SurveyRow[];
  deviceConfig: DeviceConfig | null;
  syncStatus: "idle" | "syncing" | "error";
  isOnline: boolean;
  pendingCount: number;
}

// Action types
type SurveyAction =
  | { type: "SET_SURVEYS"; payload: SurveyRow[] }
  | { type: "ADD_SURVEY"; payload: SurveyRow }
  | {
      type: "UPDATE_SURVEY_SYNC_STATUS";
      payload: { id: string; syncStatus: "synced" | "pending" | "failed" };
    }
  | { type: "SET_DEVICE_CONFIG"; payload: DeviceConfig }
  | { type: "UPDATE_DEVICE_CONFIG"; payload: Partial<DeviceConfig> }
  | { type: "SET_SYNC_STATUS"; payload: "idle" | "syncing" | "error" }
  | { type: "SET_ONLINE_STATUS"; payload: boolean }
  | { type: "SET_PENDING_COUNT"; payload: number };

// Initial state
const initialState: SurveyState = {
  surveys: [],
  deviceConfig: null,
  syncStatus: "idle",
  isOnline: true,
  pendingCount: 0,
};

// Reducer
function surveyReducer(state: SurveyState, action: SurveyAction): SurveyState {
  switch (action.type) {
    case "SET_SURVEYS":
      return { ...state, surveys: action.payload };
    case "ADD_SURVEY":
      return {
        ...state,
        surveys: [...state.surveys, action.payload],
        pendingCount: state.pendingCount + 1,
      };
    case "UPDATE_SURVEY_SYNC_STATUS":
      return {
        ...state,
        surveys: state.surveys.map((survey) =>
          survey.id === action.payload.id
            ? { ...survey, syncStatus: action.payload.syncStatus }
            : survey
        ),
        pendingCount:
          action.payload.syncStatus === "synced"
            ? Math.max(0, state.pendingCount - 1)
            : state.pendingCount,
      };
    case "SET_DEVICE_CONFIG":
      return { ...state, deviceConfig: action.payload };
    case "UPDATE_DEVICE_CONFIG":
      return {
        ...state,
        deviceConfig: state.deviceConfig
          ? {
              ...state.deviceConfig,
              ...action.payload,
              updatedAt: new Date().toISOString(),
            }
          : null,
      };
    case "SET_SYNC_STATUS":
      return { ...state, syncStatus: action.payload };
    case "SET_ONLINE_STATUS":
      return { ...state, isOnline: action.payload };
    case "SET_PENDING_COUNT":
      return { ...state, pendingCount: action.payload };
    default:
      return state;
  }
}

// Context
interface SurveyContextType {
  state: SurveyState;
  dispatch: React.Dispatch<SurveyAction>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

// Provider component
export const SurveyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(surveyReducer, initialState);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () =>
      dispatch({ type: "SET_ONLINE_STATUS", payload: true });
    const handleOffline = () =>
      dispatch({ type: "SET_ONLINE_STATUS", payload: false });

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <SurveyContext.Provider value={{ state, dispatch }}>
      {children}
    </SurveyContext.Provider>
  );
};

// Hook to use the context
export const useSurvey = () => {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error("useSurvey must be used within a SurveyProvider");
  }
  return context;
};
