import { useOutletContext } from "react-router-dom";
import Page from "../components/page/Page";
import { View } from "../types/view";

export default function HomePage() {
  const [view] = useOutletContext<[View]>();
  return <Page page={view.home} onPageChange={() => {}} />;
}
