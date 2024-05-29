import {
  Button,
  Dropdown,
  IconLineChartTrendingUp,
  Modal,
  ModalActionRow,
  ModalBody,
  ModalClose,
  OptionType,
  Tooltip,
  TooltipProvider,
} from "@nasa-jpl/react-stellar";
import { useState } from "react";
import { Dataset, DatasetStream } from "../../types/api";
import { DateRange } from "../../types/time";
import { ChartEntity } from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import Chart from "../entities/chart/Chart";
import DateRangePicker from "../ui/DateRangePicker";
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

  const [dateRange, setDateRange] = useState<DateRange>({
    end: new Date(Date.UTC(2022, 2, 2, 0, 36)).toISOString(), //2022-03-02T00:36:00
    start: new Date(Date.UTC(2022, 2, 2, 0, 26)).toISOString(), //2022-03-02T00:26:00
  });
  const [version, setVersion] = useState(datasetStream.available_versions[0]);

  const start = new Date("2022-01-01").toISOString();
  const end = new Date("2023-01-01").toISOString();

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
              <DateRangePicker
                startDate={new Date(dateRange.start)}
                endDate={new Date(dateRange.end)}
                onStartDateChange={(date) => {
                  setDateRange({
                    end: dateRange.end,
                    start: date.toISOString(),
                  });
                }}
                onEndDateChange={(date) => {
                  setDateRange({
                    end: date.toISOString(),
                    start: dateRange.start,
                  });
                }}
              />
            </div>
          </div>
          <Chart
            chartEntity={chartEntity}
            datasets={datasets}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            hoverDate={null}
            onHoverDateChange={() => {}}
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

export default DatasetPreviewModal;
