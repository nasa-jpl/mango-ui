import { TooltipProvider } from "@nasa-jpl/react-stellar";
import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import "@nasa-jpl/stellar/font/inter/inter.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./error-page";
import "./index.css";
import DatasetsPage from "./routes/DatasetsPage";
import HomePage from "./routes/HomePage";
import RootPage from "./routes/RootPage";
import SandboxPage from "./routes/SandboxPage";
import ViewPage from "./routes/ViewPage";
import { View } from "./types/view";
import "./variables.css";

const fetchView = async (): Promise<View> => {
  const data = await fetch("default-view.json");
  const view = (await data.json()) as View;
  return view;
};

export async function loader() {
  const view = await fetchView();
  return { view };
}

const router = createBrowserRouter([
  {
    path: import.meta.env.VITE_APP_PATH,
    element: <RootPage />,
    loader,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <HomePage />,
        index: true,
      },
      {
        path: "datasets",
        element: <DatasetsPage />,
      },
      {
        path: "sandbox",
        element: <SandboxPage />,
      },
      {
        path: "view/:pageGroupURL/:pageURL",
        element: <ViewPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </React.StrictMode>
);
