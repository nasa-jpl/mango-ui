import {
  Button,
  Dropdown,
  IconLineChartTrendingUp,
  Label,
  Modal,
  ModalActionRow,
  ModalBody,
  ModalClose,
  OptionType,
  Tooltip,
  TooltipProvider,
} from "@nasa-jpl/react-stellar";
import { useReducer, useState } from "react";
import { pageDateRangeReducer } from "../../reducers/date-time";
import { UPDATE_PAGE_DATE_RANGE } from "../../types/actions";
import { Dataset, DatasetStream } from "../../types/api";
import { PageDateRangeState } from "../../types/state";
import { ChartEntity } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import { toDatetimelocalStr, toUTCms } from "../../utilities/time";
import Chart from "../entities/chart/Chart";
import "./DatasetStreamPreviewModal.css";

const getDatasetStreamDisplayName = (datasetStream: DatasetStream) => {
  return `${datasetStream.mission} ${datasetStream.streamId} ${datasetStream.id}`;
};

export declare type DatasetPreviewModalProps = {
  datasetStream: DatasetStream;
  datasets: Dataset[];
};

export const DatasetPreviewModal = ({
  datasetStream,
  datasets,
}: DatasetPreviewModalProps) => {
  const [field, setField] = useState<string>(
    datasetStream.available_fields[0]?.name
  );

  const initialState: PageDateRangeState = {
    // TODO: Refactor to pull from dataset once start and end available?
    dateRange: {
      end: new Date(Date.UTC(2022, 11, 31, 11, 0)).toISOString(),
      start: new Date(Date.UTC(2022, 0, 1, 0, 0)).toISOString(),
    },
  };

  const [state, dispatch] = useReducer(pageDateRangeReducer, initialState);
  const [version, setVersion] = useState(datasetStream.available_versions[0]);

  const updateDateRange = (newDateRange: PageDateRangeState) => {
    dispatch({ type: UPDATE_PAGE_DATE_RANGE, payload: newDateRange });
  };

  const start = new Date("2022-01-01").toISOString();
  const end = new Date("2023-01-01").toISOString();

  /* TODO need to show the error somewhere */
  const chartEntity: ChartEntity = {
    dateRange: { start: start, end: end },
    id: generateUUID(),
    title: "What",
    type: "chart",
    syncWithPageDateRange: true,
    layers: [
      {
        type: "line",
        datasetId: datasetStream.id,
        startTime: start,
        endTime: end,
        version,
        field,
        id: generateUUID(),
        mission: datasetStream.mission,
        streamId: datasetStream.streamId,
      },
    ],
  };

  const onFieldChange = (selectedOption: OptionType) => {
    const value = (selectedOption as OptionType).value;
    setField(value);
  };

  const onVersionChange = (selectedOption: OptionType) => {
    const value = (selectedOption as OptionType).value;
    setVersion(value);
  };

  return (
    <Modal
      className="dataset-stream-preview-modal"
      onOpenChange={function noRefCheck() {}}
      title={`${getDatasetStreamDisplayName(datasetStream)} Preview`}
      trigger={
        <div className="dataset-stream-preview-button">
          <TooltipProvider>
            <Tooltip content="Preview">
              <Button variant="icon" icon={<IconLineChartTrendingUp />} />
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
      <ModalBody>
        <div className="dataset-stream-preview-modal-content">
          <div className="dataset-stream-preview-controls">
            <Dropdown
              value={{ value: field, label: field }}
              label="Field"
              labelPosition="left"
              // @ts-expect-error TODO fix from the react-stellar side
              onChange={onFieldChange}
              options={datasetStream.available_fields.map((f) => ({
                label: f.name,
                value: f.name,
              }))}
            />
            <Dropdown
              value={{ value: version, label: version }}
              label="Version"
              labelPosition="left"
              // @ts-expect-error TODO fix from the react-stellar side
              onChange={onVersionChange}
              options={datasetStream.available_versions.map((v) => ({
                label: v,
                value: v,
              }))}
            />
            <div className="dataset-stream-preview-date">
              <Label htmlFor="pageStartTime">Start</Label>
              <input
                type="datetime-local"
                id="page-datetime-start"
                className="st-input"
                name="pageStartTime"
                value={toDatetimelocalStr(state.dateRange.start)}
                onChange={(e) =>
                  updateDateRange({
                    dateRange: {
                      ...state.dateRange,
                      start: new Date(toUTCms(e.target.value)).toISOString(),
                    },
                  })
                }
              />
            </div>
            <div className="dataset-stream-preview-date">
              <Label htmlFor="pageEndTime">End</Label>
              <input
                type="datetime-local"
                id="page-datetime-end"
                className="st-input"
                name="pageEndTime"
                value={toDatetimelocalStr(state.dateRange.end)}
                onChange={(e) =>
                  updateDateRange({
                    dateRange: {
                      ...state.dateRange,
                      end: new Date(toUTCms(e.target.value)).toISOString(),
                    },
                  })
                }
              />
            </div>
          </div>
          <Chart
            chartEntity={chartEntity}
            datasets={datasets}
            dateRange={state.dateRange}
            onDateRangeChange={(dateRange) => updateDateRange({ dateRange })}
            showHeader={false}
          />
        </div>
      </ModalBody>
      <ModalActionRow>
        <ModalClose asChild>
          <Button variant="secondary">Close</Button>
        </ModalClose>
      </ModalActionRow>
    </Modal>
  );
};

export default Map;
