import { Button } from "@nasa-jpl/stellar-react";
import { BookOpen, Bug, Github, Mail } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { config } from "../config";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { View } from "../types/view";

const GITHUB_REPO_URL = "https://github.com/nasa-jpl/mango-ui";
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
const FEEDBACK_EMAIL = "mango.dev@jpl.nasa.gov";

type ReleaseHighlight = {
  description: string;
  pr?: string;
  title: string;
};

const recentHighlights: ReleaseHighlight[] = [
  {
    title: "Spacecraft Events & Problem Files tables",
    pr: "182",
    description:
      "Browse mission-level events and problem files in dedicated tables.",
  },
  {
    title: "Union filters on data layers",
    pr: "186",
    description:
      "DataLayer filter fields now support a union of filters for more flexible queries.",
  },
  {
    title: "More quick time-range presets",
    pr: "188",
    description:
      "Added 3-day, 7-day, and latest-24hr presets for the time range selector.",
  },
  {
    title: '"No data ingested" handling on plots and tables',
    description:
      "4xx API responses are now surfaced as a distinct no-data state in charts and tables.",
  },
];

export default function HomePage() {
  const [, , products, , , loadingInitialData] =
    useOutletContext<[View, never, Product[], never, never, boolean]>();

  const release = import.meta.env.VITE_APP_RELEASE;
  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH;
  const shortCommit = commitHash ? commitHash.slice(0, 7) : "";

  return (
    <Page title="Home" padBody>
      <div className="flex flex-col gap-4 max-w-4xl">
        <section className="bg-background rounded border overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 font-medium">
            Monitoring and ANalysis for Gravity Operations (MANGO)
          </div>
          <div className="p-4 text-base space-y-3">
            <p>
              MANGO is a downlink and telemetry monitoring tool for the GRACE
              missions. It enables users to quickly assess data quality and
              availability, compare measurements across GRACE-FO and GRACE-C,
              and export data for further analysis.
            </p>
            <p className="text-sm text-gray-600">
              This tool is in active development. Please direct feedback to{" "}
              <a
                className="text-blue-600 hover:underline"
                href={`mailto:${FEEDBACK_EMAIL}`}
              >
                {FEEDBACK_EMAIL}
              </a>
              .
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" asChild>
                <a
                  href={config.endpoints.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen size={16} />
                  Documentation
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github size={16} />
                  GitHub
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={GITHUB_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bug size={16} />
                  Report an issue
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`mailto:${FEEDBACK_EMAIL}`}>
                  <Mail size={16} />
                  Email feedback
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-background rounded border overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 font-medium flex items-center justify-between">
            <span>What's new</span>
            <a
              className="text-xs text-blue-600 hover:underline"
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              View all releases
            </a>
          </div>
          <ul className="p-4 space-y-3 text-sm">
            {recentHighlights.map((item) => (
              <li key={item.title} className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{item.title}</span>
                  {item.pr && (
                    <a
                      className="text-xs text-blue-600 hover:underline"
                      href={`${GITHUB_REPO_URL}/pull/${item.pr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      #{item.pr}
                    </a>
                  )}
                </div>
                <span className="text-gray-600">{item.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-background rounded border overflow-hidden">
          <div className="p-4 text-sm">
            <span className="text-gray-600">Product count: </span>
            <span className="font-semibold">
              {loadingInitialData ? "Loading…" : products.length}
            </span>
          </div>
        </section>

        <section className="bg-background rounded border overflow-hidden">
          <div className="px-3 py-2 border-b bg-gray-50 font-medium">
            Software versions
          </div>
          <dl className="p-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-600">Release</dt>
            <dd className="font-mono font-semibold">{release || "—"}</dd>
            <dt className="text-gray-600">Git commit</dt>
            <dd className="font-mono font-semibold">
              {commitHash ? (
                <a
                  className="text-blue-600 hover:underline"
                  href={`${GITHUB_REPO_URL}/commit/${commitHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortCommit}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </dl>
        </section>
      </div>
    </Page>
  );
}
