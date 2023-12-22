import Plotly, { Data, Layout } from "plotly.js-dist-min";
import { useEffect, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/app/Sidebar/Sidebar";
import { DateRange } from "./types/time";
import { getData } from "./utilities/api";

import {
  Button,
  Dropdown,
  IconMove,
  Input,
  OptionType,
  Progress,
} from "@nasa-jpl/react-stellar";
import GridLayout, { WidthProvider } from "react-grid-layout";
import Map from "./components/entities/map/Map";
import Table, { TableData } from "./components/ui/DataGrid/DataGrid";
import { Metadata, QueryMetadata, TelemetryMap } from "./types/data";
import { View } from "./types/view";
import "/node_modules/react-grid-layout/css/styles.css";
import "/node_modules/react-resizable/css/styles.css";

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

function getEntityName(id: number | string, metadata: Metadata | undefined) {
  return (
    metadata?.available_streams.find(
      (stream) => stream.id.toString() === id.toString()
    )?.name || `Satellite ID: ${id}`
  );
}

let cancelHandles: (() => void)[] = [];

function App() {
  const [view, setView] = useState<View>();
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(true);
  const [metadata, setMetadata] = useState<Metadata>();
  const [selectedField, setSelectedField] = useState<OptionType | null>(null);
  const [selectedDecimation, setSelectedDecimation] =
    useState<OptionType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: "2022-12-01T12:00:00",
    end: "2022-12-01T13:00:00",
  });
  const [loadingPlot, setLoadingPlot] = useState(false);
  const [queryMetadata, setQueryMetadata] = useState<QueryMetadata>();
  const [telemetry, setTelemetry] = useState<TelemetryMap>();

  // useEffect(() => {
  //   const stats = new Stats();
  //   stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  //   if (document.getElementById("stats")?.childElementCount !== 0) return;
  //   document.getElementById("stats")?.appendChild(stats.dom);

  //   function animate() {
  //     stats.begin();
  //     // monitored code goes here
  //     stats.end();
  //     requestAnimationFrame(animate);
  //   }
  //   requestAnimationFrame(animate);
  // });

  useEffect(() => {
    fetchView();
    fetchInitialFields();
  }, []);

  const fetchView = async () => {
    const data = await fetch("/default-view.json");
    const view = (await data.json()) as View;
    setView(view);
    console.log("view :>> ", view);
  };

  const fetchInitialFields = async () => {
    // const metadata = await getMetadata("GRACEFO-1A");
    // setMetadata(metadata);
    // if (metadata) {
    //   const firstDecimationRatio = metadata.available_decimation_ratios[0];
    //   setSelectedDecimation({
    //     value: firstDecimationRatio,
    //     label: `1:${firstDecimationRatio}`,
    //   });
    // }
    setLoadingMetadata(false);
  };

  const loadPlot = async () => {
    try {
      await plotData();
    } catch (err) {
      console.log("err :>> ", err);
    }
  };

  const fetchData = async (): Promise<TelemetryMap> => {
    if (cancelHandles) cancelHandles.forEach((cancelHandle) => cancelHandle());
    cancelHandles = [];
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      setLoadingPlot(true);
      // setRequestID(requestID + 1);
      const streamIds = [1, 2];
      let newQueryMetadata: QueryMetadata = streamIds.reduce(
        (acc: QueryMetadata, id) => {
          acc[id] = { duration: 0, length: 0, received: 0 };
          return acc;
        },
        {}
      );
      setQueryMetadata(newQueryMetadata);
      const promises = streamIds.map((id) => {
        return new Promise((res, rej) => {
          const { json, target, cancel } = getData(
            // "GRACEFO-1A",
            "GRACEFO-ACC1A-LTTB",
            id,
            dateRange,
            selectedDecimation?.value
          );
          cancelHandles.push(cancel);

          json().then(({ result, error }) => {
            if (error) {
              if (error.name === "AbortError") {
                rej("AbortError");
              } else {
                rej(error);
              }
            } else {
              newQueryMetadata = {
                ...newQueryMetadata,
                [id]: {
                  ...newQueryMetadata[id],
                  duration: Date.now() - startTime,
                },
              };
              setQueryMetadata(newQueryMetadata);
              res({ streamId: id, result: result.data });
            }
          });
          target.addEventListener("progress", (event: CustomEventInit) => {
            const { length, received } = event.detail;
            newQueryMetadata = {
              ...newQueryMetadata,
              [id]: {
                ...newQueryMetadata[id],
                length,
                received,
              },
            };

            setQueryMetadata(newQueryMetadata);
          });

          target.addEventListener("failure", (event: Event) => {
            // setLoadingPlot(false);
            rej(event);
          });
        });
      });
      return Promise.all(promises)
        .then((results) => {
          const telemetryMap = results.reduce((acc, result) => {
            acc[result.streamId] = result.result;
            return acc;
          }, {});
          setLoadingPlot(false);
          resolve(telemetryMap as TelemetryMap);
        })
        .catch((err) => {
          console.log("err :>> ", err);
          reject([]);
        });
    });
  };

  const plotData = async () => {
    const newTelemetry = await fetchData();
    setTelemetry(newTelemetry);

    const data: Data[] = Object.entries(newTelemetry).map(([key, values]) => {
      const entityName = getEntityName(key, metadata);
      const newValues = [];
      console.log(values, `${selectedField?.value}_max` in values[0]);
      values.forEach((v) => {
        if (`${selectedField?.value}_max` in v) {
          console.log("WOW");
          newValues.push({
            x: new Date(v.timestamp),
            y: v[`${selectedField?.value}_min`],
          });
          newValues.push({
            x: new Date(v.timestamp),
            y: v[`${selectedField?.value}_max`],
          });
        } else {
          newValues.push({
            x: new Date(v.timestamp),
            y: v[selectedField?.value],
          });
        }
      });
      console.log(newValues);
      return {
        // x: newValues.map((v) => new Date(v.timestamp)),
        x: newValues.map((v) => v.x),
        y: newValues.map((v) => v.y),
        // y: newValues.map((v) => {
        //   const value =
        //     selectedField?.value in v
        //       ? v[selectedField?.value]
        //       : v[`${selectedField?.value}_max`];
        //   return value as number;
        // }),
        type: "scattergl",
        name: entityName,
        line: {
          width: 1,
        },
      };
    });

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
      // if (xAxisAutorange || yAxisAutorange) {
      // } else if (xAxisRange0 || xAxisRange1) {
      // }
    });
  };
  const tableData: TableData[] = Object.values(telemetry || {})
    .flat()
    .map((entry) => {
      return {
        timestamp: entry.timestamp as string,
        satellite_id: entry.satellite_id as number,
        value: entry[selectedField?.value] as number,
      };
    });

  let progress = 0;
  if (loadingPlot && queryMetadata) {
    let totalSize = 0;
    let totalReceived = 0;
    Object.values(queryMetadata).forEach(({ length, received }) => {
      totalSize += length;
      totalReceived += received;
    });
    progress = (totalReceived / (totalSize || 1)) * 100;
  }
  console.log("view,???? :>> ", view, "????");
  console.log("object :>> ", object);
  return (
    <div className="app">
      <div className="app-runtime-stats" id="stats" />
      <Sidebar view={view} title={import.meta.env.VITE_APP_TITLE} />
      <div>
        {loadingMetadata && (
          <div className="app-initial-loading st-typography-label">
            Loading...
          </div>
        )}
        {!loadingMetadata && (
          <>
            <div className="app-top-row">
              <Dropdown
                value={selectedField}
                label="Field"
                labelPosition="left"
                onChange={(newValue) =>
                  setSelectedField(newValue as OptionType)
                }
                options={(metadata?.available_fields || []).map((field) => ({
                  label: field,
                  value: field,
                }))}
              />

              <Dropdown
                className="dropdown"
                value={selectedDecimation}
                label="Decimation Level"
                labelPosition="left"
                onChange={(newValue) =>
                  setSelectedDecimation(newValue as OptionType)
                }
                options={(metadata?.available_decimation_ratios || []).map(
                  (level) => ({
                    label: `1:${level}`,
                    value: level,
                  })
                )}
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
              <Button
                disabled={!selectedField || !selectedDecimation}
                onClick={() => loadPlot()}
              >
                Plot
              </Button>
              {loadingPlot && (
                <div className="app-loading st-typography-label">
                  Loading plot
                  <Progress progress={progress} />
                </div>
              )}
            </div>

            {!loadingMetadata &&
              !loadingPlot &&
              telemetry &&
              Object.entries(telemetry).map(([key, values]) => {
                const queryDuration = queryMetadata
                  ? queryMetadata[key].duration / 1000
                  : 0;
                const queryBytes = queryMetadata
                  ? queryMetadata[key].length
                  : 0;
                return (
                  <div
                    key={key}
                    className="app-query-stats st-typography-label"
                  >
                    <b style={{ marginRight: "8px" }}>
                      {getEntityName(key, metadata)}:
                    </b>
                    Query Duration: {queryDuration}s, Data Points:{" "}
                    {values.length}, Size: {formatBytes(queryBytes)}
                  </div>
                );
              })}

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
                <Table data={tableData} />
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
      </div>
    </div>
  );
}

export default App;
