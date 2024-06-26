import { TooltipProvider } from "@nasa-jpl/react-stellar";
import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import "@nasa-jpl/stellar/font/inter/inter.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ErrorPage from "./error-page";
import "./index.css";
import HomePage from "./routes/HomePage";
import ProductsPage from "./routes/ProductsPage";
import RootPage from "./routes/RootPage";
import SandboxPage from "./routes/SandboxPage";
import ViewPage from "./routes/ViewPage";
import { getView } from "./utilities/api";
import "./variables.css";

export async function loader() {
  let view = {};
  try {
    view = await getView();
  } catch (err) {
    // TODO generate a default view
    return {};
  }
  return { view };
}

const router = createBrowserRouter(
  [
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
          path: "products",
          element: <ProductsPage />,
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
  ],
  { basename: import.meta.env.VITE_APP_PATH }
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </React.StrictMode>
);
