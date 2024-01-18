import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
  const data = await fetch("/default-view.json");
  const view = (await data.json()) as View;
  return view;
};

export async function loader() {
  const view = await fetchView();
  return { view };
}

// export async function datasetsLoader() {
//   const datasets: Dataset[] = [];
//   datasets.push({
//     id: Math.random().toString(),
//     name: "ACC1A_A",
//     mission: "GRACE",
//   });
//   datasets.push({
//     id: Math.random().toString(),
//     name: "ACC1A_B",
//     mission: "GRACE",
//   });
//   return { datasets };
// }

const router = createBrowserRouter([
  {
    path: "/",
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
        // loader: datasetsLoader,
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
    <RouterProvider router={router} />
  </React.StrictMode>
);
