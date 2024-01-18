import { useEffect, useState } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import Sidebar from "../components/app/Sidebar/Sidebar";
import { Dataset, View } from "../types/view";
import { getDatasets, getMissions } from "../utilities/api";

export default function RootPage() {
  // TODO consider a reducer for this instead of context?
  const { view: initialView } = useLoaderData() as Record<"view", View>;
  const [view, setView] = useState<View>(initialView);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = () => {
    fetchView();
    fetchDatasets();
  };

  const fetchView = async () => {
    const data = await fetch("/default-view.json");
    const view = (await data.json()) as View;
    setView(view);
    console.log("view :>> ", view);
  };

  const fetchDatasets = async () => {
    const missions = await getMissions();
    const datasets = await Promise.all(
      missions.map((mission) => getDatasets(mission))
    );
    console.log("datasets :>> ", datasets);
    setDatasets(datasets.flat());
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar view={view} title={import.meta.env.VITE_APP_TITLE} />
      <Outlet context={[view, setView, datasets]} />
    </div>
  );
}
