import { TooltipProvider } from "@nasa-jpl/stellar-react";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AlertDialogProvider } from "./components/ui/AlertDialogProvider";
import ErrorPage from "./error-page";
import "./index.css";
import HomePage from "./routes/HomePage";
import ManagementPage from "./routes/ManagementPage";
import ProductsPage from "./routes/ProductsPage";
import RootPage from "./routes/RootPage";
import ViewPage from "./routes/ViewPage";
import { getView } from "./utilities/api";
import { createView } from "./utilities/view";
import "./variables.css";

export async function loader() {
  let view = {};
  try {
    view = await getView();
  } catch {
    return { view: createView() };
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
        // {
        //   path: "sandbox",
        //   element: <SandboxPage />,
        // },
        {
          path: "manage",
          element: <ManagementPage />,
        },
        // {
        //   path: "sandbox",
        //   element: <SandboxPage />,
        // },
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
      <AlertDialogProvider>
        <Toaster />
        <RouterProvider router={router} />
      </AlertDialogProvider>
    </TooltipProvider>
  </React.StrictMode>
);
