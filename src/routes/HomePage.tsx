import { useOutletContext } from "react-router-dom";
import ViewPage from "../components/page/ViewPage";
import { View } from "../types/view";

export default function HomePage() {
  const [view] = useOutletContext<[View]>();
  return <ViewPage viewPage={view.home} onPageChange={() => {}} />;
}
