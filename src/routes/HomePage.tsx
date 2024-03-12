import { useOutletContext } from "react-router-dom";
import ViewPage from "../components/page/ViewPage";
import { View } from "../types/view";

export default function HomePage() {
  const [view] = useOutletContext<[View]>();
  // @ts-expect-error fixing in future PR
  return <ViewPage viewPage={view.home} onPageChange={() => {}} />;
}
