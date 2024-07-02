import {
  Button,
  Dropdown,
  Modal,
  ModalActionRow,
  ModalBody,
  ModalClose,
  OptionType,
  Tooltip,
  TooltipProvider,
} from "@nasa-jpl/react-stellar";
import { ChartLine } from "@phosphor-icons/react";
import { useState } from "react";
import { Product } from "../../types/api";
import { DateRange } from "../../types/time";
import { ChartEntity } from "../../types/view";
import Chart from "../entities/chart/Chart";
import DateRangePicker from "../ui/DateRangePicker";
import "./ProductPreviewModal.css";

const getProductDisplayName = (product: Product) => {
  return `${product.mission} ${product.instruments[0]} ${product.id}`;
};

export declare type ProductPreviewModalProps = {
  product: Product;
  products: Product[];
};

export const ProductPreviewModal = ({
  product,
  products,
}: ProductPreviewModalProps) => {
  const [field, setField] = useState<string>(product.available_fields[0]?.name);
  const [version, setVersion] = useState(product.available_versions[0]);
  // TODO populate from data_begin and end
  const [dateRange, setDateRange] = useState<DateRange>({
    end: new Date(product.datasets[0].data_end).toISOString(), //2022-03-02T00:36:00
    start: new Date(product.datasets[0].data_begin).toISOString(), //2022-03-02T00:26:00
  });

  const start = new Date("2022-01-01").toISOString();
  const end = new Date("2023-01-01").toISOString();

  const chartEntity: ChartEntity = {
    dateRange: { start: start, end: end },
    id: "chartEntity1",
    title: "What",
    type: "chart",
    syncWithPageDateRange: true,
    yAxes: [{ position: "left", id: "y1" }],
    layers: [
      {
        type: "line",
        dataset: product.id,
        startTime: start,
        endTime: end,
        version,
        field,
        id: "layer1",
        mission: product.mission,
        instrument: product.instruments[0] /* TODO make it instrument */,
        yAxisId: "y1",
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
      className="product-preview-modal"
      onOpenChange={function noRefCheck() {}}
      title={`${getProductDisplayName(product)} Preview`}
      trigger={
        <div className="product-preview-button">
          <TooltipProvider>
            <Tooltip content="Preview">
              <Button
                variant="icon"
                icon={<ChartLine height={24} width={24} />}
              />
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
      <ModalBody>
        <div className="product-preview-modal-content">
          <div className="product-preview-controls">
            <Dropdown
              className="product-preview-field"
              value={{ value: field, label: field }}
              label="Field"
              labelPosition="left"
              // @ts-expect-error TODO fix from the react-stellar side
              onChange={onFieldChange}
              options={product.available_fields.map((f) => ({
                label: (
                  <div className="product-preview-field--label">
                    {f.name}
                    <div>
                      {f.unit} ({f.type})
                    </div>
                  </div>
                ),
                value: f.name,
              }))}
            />
            <Dropdown
              value={{ value: version, label: version }}
              label="Version"
              labelPosition="left"
              // @ts-expect-error TODO fix from the react-stellar side
              onChange={onVersionChange}
              options={product.available_versions.map((v) => ({
                label: v,
                value: v,
              }))}
            />
            <div className="product-preview-date">
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
            products={products}
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

export default ProductPreviewModal;
