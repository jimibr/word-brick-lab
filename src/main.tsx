import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeGeometry } from "./geometry/createBrick";

const root = createRoot(document.getElementById("root")!);
void initializeGeometry().then(
  () =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error);
    root.render(
      <p role="alert">
        3D model se nepodařilo načíst. / Could not load the 3D engine.
      </p>,
    );
  },
);
