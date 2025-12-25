import { getAnalytics, isSupported } from "firebase/analytics";
import app from "./firebase";

export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};
