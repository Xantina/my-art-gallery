import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;

    const checkForUpdate = () => {
      if (!navigator.onLine || registration.installing) return;
      void registration.update().catch((error: unknown) => {
        console.warn("Unable to check for a site update:", error);
      });
    };

    checkForUpdate();
    window.setInterval(checkForUpdate, 60_000);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});
