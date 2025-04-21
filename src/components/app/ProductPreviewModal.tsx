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
import { Channel, ChartEntity } from "../../types/view";
import Chart from "../entities/chart/Chart";
import DateRangePicker from "../ui/DateRangePicker";
import "./ProductPreviewModal.css";

const getProductDisplayName = (product: Product, instrument?: string) => {
  return `${product.mission} ${instrument || product.instruments[0]} ${
    product.id
  }`;
};

export declare type ProductPreviewModalProps = {
  dateRange?: DateRange | undefined;
  field?: string;
  instrument?: string;
  onClose: () => void;
  product?: Product;
  products: Product[];
  version?: string;
};

export const ProductPreviewModal = ({
  onClose,
  product,
  products,
  instrument,
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
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    let field = "";
    let channels: Channel[] = [];
    let version = "";
    let dateRange = {
      end: new Date("2025").toISOString(),
      start: new Date("2020").toISOString(),
    };
    if (product) {
      field =
        (defaultField ||
          product.available_fields.find((field) => !field.is_channel_id)
            ?.name) ??
        "";
      version = defaultVersion || product.available_versions[0];
      dateRange = defaultDateRange || {
        end: new Date(product.datasets[0].data_end).toISOString(),
        start: new Date(product.datasets[0].data_begin).toISOString(),
      };
      channels = product.available_fields
        .filter((f) => f.is_channel_id)
        .map((channel) => {
          return {
            id: channel.name,
            value: channel.enum_values ? channel.enum_values[0] : "",
          };
        });
    }
    setField(field);
    setVersion(version);
    setDateRange(dateRange);
    setChannels(channels);
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
        fields: [field],
        id: "layer1",
        mission: product.mission,
        instrument: instrument || product.instruments[0],
        yAxisId: "y1",
        channels,
      },
    ],
  };

  const onFieldChange = (selectedOption: OptionType) => {
    const value = (selectedOption as OptionType).value;
    setField(value);
  };

  const onChannelChange = (selectedOption: OptionType, channel: Channel) => {
    const value = (selectedOption as OptionType).value;
    const newChannels = channels.map((c) => {
      if (c.id === channel.id) {
        return { ...c, value };
      }
      return c;
    });
    setChannels(newChannels);
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
      title={
        <div className="product-preview-modal-title">
          {getProductDisplayName(product, instrument)}
          <div className="product-preview-date">
            <DateRangePicker
              startDate={new Date(dateRange.start)}
              endDate={new Date(dateRange.end)}
              onChange={(startDate, endDate) => {
                setDateRange({
                  end: endDate.toISOString(),
                  start: startDate.toISOString(),
                });
              }}
            />
          </div>
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
              options={product.available_fields
                .filter(
                  (f) =>
                    !f.is_channel_id && (f.type === "int" || f.type === "float")
                )
                .map((f) => ({
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
            {channels.map((channel) => {
              const matchingChannel = product.available_fields.find(
                (f) => f.name === channel.id
              );
              return (
                <Dropdown
                  className="product-preview-field"
                  value={{ value: channel.value, label: channel.value }}
                  label={channel.id}
                  labelPosition="left"
                  onChange={(selectedOption) =>
                    // @ts-expect-error TODO fix from the react-stellar side
                    onChannelChange(selectedOption, channel)
                  }
                  options={(matchingChannel?.enum_values || [])
                    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
                    .map((v) => ({
                      label: v,
                      value: v,
                    }))}
                />
              );
            })}
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
          </div>
          <Chart
            chartEntity={chartEntity}
            products={products}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            hoverDate={null}
            onHoverDateChange={() => {}}
            selectedPoint={null}
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
