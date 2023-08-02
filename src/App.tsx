import { useEffect, useState } from "react";
import "./App.css";
import "@nasa-jpl/react-stellar/dist/esm/stellar.css";
import Plotly, { Data, Layout } from "plotly.js-dist-min";
import Navbar from "./components/navbar/Navbar";
import { getAvailableDataFields, getData } from "./utils/api";
import { DateRange } from "./types/time";

import {
  Button,
  Dropdown,
  IconMove,
  Input,
  OptionType,
  Progress,
} from "@nasa-jpl/react-stellar";
import { Telemetry } from "./types/data";
import Stats from "stats.js";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";
import GridLayout, { WidthProvider } from "react-grid-layout";
import Map from "./Map";

const ResponsiveGridLayout = WidthProvider(GridLayout);

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "Bytes",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
  ];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

let cancelHandle: (() => void) | null = null;

function App() {
  const [loadingFields, setLoadingFields] = useState<boolean>(true);
  const [fields, setFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<OptionType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: "2022-12-01T12:00:00",
    end: "2022-12-01T12:00:01",
  });
  const [loadingPlot, setLoadingPlot] = useState(false);
  const [queryDuration, setQueryDuration] = useState<number>(0);
  const [querySize, setQuerySize] = useState<number>(0);
  const [progress, setLoadingProgress] = useState<number>(0);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [requestID, setRequestID] = useState<number>(0);

  useEffect(() => {
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    if (document.getElementById("stats")?.childElementCount !== 0) return;
    document.getElementById("stats")?.appendChild(stats.dom);

    function animate() {
      stats.begin();
      // monitored code goes here
      stats.end();
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  });

  useEffect(() => {
    fetchInitialFields();
  }, []);

  const fetchInitialFields = async () => {
    const initialFields = await getAvailableDataFields("GRACEFO-1A");
    setFields(initialFields);
    setLoadingFields(false);
  };

  const loadPlot = async () => {
    try {
      await plotData(dateRange);
    } catch (err) {
      console.log("err :>> ", err);
    }
  };

  const fetchData = async () => {
    if (cancelHandle) cancelHandle();
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      setLoadingPlot(true);
      setLoadingProgress(0);
      setQueryDuration(0);
      setQuerySize(0);
      setRequestID(requestID + 1);
      const { json, target, cancel } = getData("GRACEFO-1A", dateRange);
      cancelHandle = cancel;
      json({}).then(({ result, error }) => {
        if (error && error.name === "AbortError") {
          reject();
        } else {
          setLoadingPlot(false);
          setQueryDuration(Date.now() - startTime);
          resolve(result);
        }
      });
      target.addEventListener("progress", (event: CustomEventInit) => {
        const { length, received } = event.detail;
        const percent = (received / length) * 100;
        setLoadingProgress(percent);
        setQuerySize(length);
      });

      target.addEventListener("failure", (event: Event) => {
        setLoadingPlot(false);
        reject();
      });
    });
  };

  const plotData = async (dateRange: DateRange) => {
    // Data is very hand wavy right now so this endpoint represents two spacecraft?
    const { data: newTelemetry } = await fetchData();
    setTelemetry(newTelemetry);

    // Gather traces based off satellite ID
    const telemetryBySatellite: Record<
      string,
      { times: Date[]; values: number[] }
    > = {};
    (newTelemetry as Telemetry[]).forEach((entry) => {
      const satellite_id = entry["satellite_id"] as number;
      if (!(satellite_id in telemetryBySatellite)) {
        telemetryBySatellite[satellite_id] = { times: [], values: [] };
      }
      telemetryBySatellite[satellite_id].times.push(
        new Date(entry["rcv_timestamp"])
      );
      telemetryBySatellite[satellite_id].values.push(
        entry[selectedField?.value] as number
      );
    });

    const data: Data[] = Object.entries(telemetryBySatellite).map(
      ([key, value]) => ({
        x: value.times,
        y: value.values,
        type: "scattergl",
        name: `Satellite ID: ${key}`,
        line: {
          width: 1,
        },
      })
    );

    const layout: Partial<Layout> = {
      title: `${selectedField?.value}`,
      font: {
        family: "Inter, Roboto, Arial, Helvetica, sans-serif", // TODO need to include inter on the page, not just from stellar...?
      },
      xaxis: {
        type: "date",
      },
    };

    const plot = await Plotly.newPlot("myDiv", data, layout, {
      scrollZoom: true,
      responsive: true,
    });

    /* 
        Pretty BS events..
        // plotly_relayout update: Cartesian
        //// Upon resizing plot:
        {
        xaxis.range[0]: , // new value if xaxis.range[0] was updated
        xaxis.range[1]: ,
        yaxis.range[0]: , // new value if yaxis.range[0] was updated
        yaxis.range[1]:
        }
        //// Upon autosizing plot:
        {
        xaxis.autorange: true,
        yaxis.autorange: true
        }
      */
    plot.on("plotly_relayout", (event: Plotly.PlotRelayoutEvent) => {
      const xAxisAutorange = event["xaxis.autorange"];
      const xAxisRange0 = event["xaxis.range[0]"];
      const xAxisRange1 = event["xaxis.range[1]"];
      const yAxisAutorange = event["yaxis.autorange"];
      // const yAxisRange0 = event["yaxis.range[0]"];
      // const yAxisRange1 = event["yaxis.range[1]"];
      if (xAxisAutorange || yAxisAutorange) {
      } else if (xAxisRange0 || xAxisRange1) {
      }
    });
  };

  return (
    <>
      <div className="app-runtime-stats" id="stats" />
      <Navbar />
      {loadingFields && (
        <div className="app-initial-loading st-typography-label">
          Loading fields...
        </div>
      )}
      {!loadingFields && (
        <>
          <div className="app-top-row">
            <Dropdown
              value={selectedField}
              label="Field"
              labelPosition="left"
              onChange={(newValue) => setSelectedField(newValue as OptionType)}
              options={fields.map((field) => ({ label: field, value: field }))}
            />

            <label className="st-typography-label" htmlFor="start">
              Start
            </label>
            <Input
              name="start"
              type="text"
              value={dateRange.start}
              onChange={async (event) => {
                setDateRange({
                  start: event.currentTarget.value,
                  end: dateRange.end,
                });
              }}
            />
            <label className="st-typography-label" htmlFor="end">
              End
            </label>
            <Input
              name="end"
              type="text"
              value={dateRange.end}
              onChange={async (event) => {
                setDateRange({
                  start: dateRange.start,
                  end: event.currentTarget.value,
                });
              }}
            />
            <Button disabled={!selectedField} onClick={() => loadPlot()}>
              Plot
            </Button>
            {loadingPlot && (
              <div className="app-loading st-typography-label">
                Loading plot
                <Progress progress={progress} />
              </div>
            )}
          </div>

          {!loadingFields && !loadingPlot && !!telemetry.length && (
            <div className="app-query-stats st-typography-label">
              Query Duration: {queryDuration / 1000}s, Data Points:{" "}
              {telemetry.length}, Size: {formatBytes(querySize)}
            </div>
          )}
          <ResponsiveGridLayout
            className="app-grid"
            cols={2}
            rowHeight={40}
            width={1200}
            draggableHandle=".handle"
          >
            <div key="a" data-grid={{ x: 0, y: 0, w: 1, h: 8, minH: 8 }}>
              <IconMove className="handle" />
              <div id="myDiv" style={{ width: "100%", height: "100%" }}>
                Chart
              </div>
            </div>
            <div key="b" data-grid={{ x: 2, y: 0, w: 1, h: 8, minH: 8 }}>
              <IconMove className="handle" />
              Chart
            </div>
            <div key="c" data-grid={{ x: 0, y: 2, w: 1, h: 8, minH: 8 }}>
              <IconMove className="handle" />
              Table
            </div>
            <div key="d" data-grid={{ x: 2, y: 2, w: 1, h: 8, minH: 8 }}>
              <IconMove className="handle" />
              <div style={{ height: "inherit", width: "inherit" }}>
                <Map />
              </div>
            </div>
          </ResponsiveGridLayout>
        </>
      )}
    </>
  );
}

export default App;
