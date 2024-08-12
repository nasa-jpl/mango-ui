import {
  Button,
  Dropdown,
  Modal,
  ModalActionRow,
  ModalBody,
  ModalClose,
  OptionType,
} from "@nasa-jpl/react-stellar";
import { useEffect, useState } from "react";
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
  dateRange?: DateRange | undefined;
  field?: string;
  onClose: () => void;
  product?: Product;
  products: Product[];
  version?: string;
};

export const ProductPreviewModal = ({
  onClose,
  product,
  products,
  version: defaultVersion = "",
  dateRange: defaultDateRange,
  field: defaultField = "",
}: ProductPreviewModalProps) => {
  const [field, setField] = useState<string>(defaultField);
  const [version, setVersion] = useState(defaultVersion);
  const [dateRange, setDateRange] = useState<DateRange>(
    defaultDateRange || {
      end: new Date("2025").toISOString(),
      start: new Date("2020").toISOString(),
    }
  );

  useEffect(() => {
    let field = "";
    let version = "";
    let dateRange = {
      end: new Date("2025").toISOString(),
      start: new Date("2020").toISOString(),
    };
    if (product) {
      field = defaultField || product.available_fields[0].name;
      version = defaultVersion || product.available_versions[0];
      dateRange = defaultDateRange || {
        end: new Date(product.datasets[0].data_end).toISOString(),
        start: new Date(product.datasets[0].data_begin).toISOString(),
      };
    }
    setField(field);
    setVersion(version);
    setDateRange(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(product),
    defaultField,
    defaultVersion,
  ]);

  if (!product) {
    return null;
  }

  const chartEntity: ChartEntity = {
    dateRange,
    id: "chartEntity1",
    title: field,
    type: "chart",
    syncWithPageDateRange: true,
    yAxes: [{ position: "left", id: "y1" }],
    layers: [
      {
        type: "line",
        dataset: product.id,
        startTime: dateRange.start,
        endTime: dateRange.end,
        version,
        field,
        id: "layer1",
        mission: product.mission,
        instrument: product.instruments[0],
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
      onOpenChange={onClose}
      open
      title={`${getProductDisplayName(product)} Preview`}
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
