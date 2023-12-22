import { useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import Sidebar from "../components/app/Sidebar/Sidebar";
import { View } from "../types/view";

export default function RootPage() {
  // TODO consider a reducer for this instead of context?
  const { view: initialView } = useLoaderData() as Record<"view", View>;
  const [view, setView] = useState<View>(initialView);
  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar view={view} title={import.meta.env.VITE_APP_TITLE} />
      <Outlet context={[view, setView]} />
    </div>
  );
}
