import { useOutletContext } from "react-router-dom";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { View } from "../types/view";

export default function HomePage() {
  const [, , products, , loadingInitialData] =
    useOutletContext<[View, never, Product[], never, boolean]>();
  return (
    <Page title="Home" padBody>
      <div className="entity text-base">
        <div className="entity-header !justify-start">
          MANGO (
          <i>Monitoring and ANalysis for Gravity Operations (MANGO) Tool</i>)
        </div>
        <div className="p-4">
          <div>
            This tool enables users to monitor and interactively analyze L1 and
            L2 science data from GRACE-FO and GRACE-C. This tool is currently in
            early development. Please direct feedback to{" "}
            <a href="mailto:mango.dev@jpl.nasa.gov">mango.dev@jpl.nasa.gov</a>
          </div>
          <br />
          <div className="text">
            Product Count: {loadingInitialData ? "Loading..." : products.length}
          </div>
          <div>Version: {APP_VERSION}</div>
        </div>
      </div>
    </Page>
  );
}
