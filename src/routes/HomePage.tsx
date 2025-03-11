import { useOutletContext } from "react-router-dom";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { View } from "../types/view";
import "./HomePage.css";

export default function HomePage() {
  const [, , products, , loadingInitialData] =
    useOutletContext<[View, never, Product[], never, boolean]>();
  return (
    <Page title="Home" padBody>
      <div className="entity st-typography-displayBody">
        <div className="entity-header home-page-header">
          MANGO (
          <i>Monitoring and ANalysis for Gravity Operations (MANGO) Tool</i>)
        </div>
        <div className="home-page-content">
          <div>
            This tool enables users to monitor and interactively analyze L1 and
            L2 science data from GRACE-FO and GRACE-C. This tool is currently in
            early development. Please direct feedback to{" "}
            <a href="mailto:mango.dev@jpl.nasa.gov">mango.dev@jpl.nasa.gov</a>
          </div>
          <br />
          <div>
            Product Count: {loadingInitialData ? "Loading..." : products.length}
          </div>
          <div>Version: 0.2 alpha</div>
        </div>
      </div>
    </Page>
  );
}
