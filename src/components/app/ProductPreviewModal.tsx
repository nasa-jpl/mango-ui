import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nasa-jpl/stellar-react";
import { useEffect, useState } from "react";
import { Product } from "../../types/api";
import { DateRange } from "../../types/time";
import { Channel, ChartEntity } from "../../types/view";
import Chart from "../entities/chart/Chart";
import { DateRangePicker } from "../ui/DateRangePicker";

const getProductDisplayName = (product: Product, instrument?: string) => {
  return `${product.mission} ${instrument || product.instruments[0]} ${
    product.id
  }`;
};

export declare type ProductPreviewModalProps = {
  dateBounds?: DateRange;
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
  dateBounds,
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
          product.available_fields.find(
            (field) =>
              !field.is_channel_id &&
              (field.type === "int" || field.type === "float")
          )?.name) ??
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

  const onChannelChange = (value: string, channel: Channel) => {
    const newChannels = channels.map((c) => {
      if (c.id === channel.id) {
        return { ...c, value };
      }
      return c;
    });
    setChannels(newChannels);
  };

  const computedDateBounds = dateBounds || {
    start: "2010T00:00:00Z",
    end: "2050T00:00:00Z",
  };

  return (
    <Dialog onOpenChange={onClose} open>
      <DialogContent className="w-[80vw] h-[80vh] max-w-none max-h-none flex flex-col">
        <DialogHeader>
          <div className="items-center flex flex-1 justify-between mr-4">
            <DialogTitle>
              {getProductDisplayName(product, instrument)}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="flex gap-5 flex-wrap items-baseline py-0.5">
            <div className="flex gap-2 items-center">
              <Label size="sm">Field</Label>
              <Select onValueChange={setField} value={field}>
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent size="xs">
                  {product.available_fields
                    .filter(
                      (f) =>
                        !f.is_channel_id &&
                        (f.type === "int" || f.type === "float")
                    )
                    .map((f) => {
                      return (
                        <SelectItem size="xs" value={f.name}>
                          <div className="flex gap-1">
                            {f.name}
                            <div className="text-muted-foreground">
                              {f.unit} ({f.type})
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>
            {channels.map((channel) => {
              const matchingChannel = product.available_fields.find(
                (f) => f.name === channel.id
              );
              return (
                <div className="flex gap-2 items-center">
                  <Label size="sm">{channel.id}</Label>
                  <Select
                    onValueChange={(value) => onChannelChange(value, channel)}
                    value={channel.value}
                  >
                    <SelectTrigger
                      size="xs"
                      className="flex-1 max-w-96 min-w-24"
                    >
                      <SelectValue placeholder="Select value" />
                    </SelectTrigger>
                    <SelectContent size="xs">
                      {(matchingChannel?.enum_values || [])
                        .sort((a, b) =>
                          a.localeCompare(b, "en", { numeric: true })
                        )
                        .map((v) => (
                          <SelectItem size="xs" value={v}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            <div className="flex gap-2 items-center">
              <Label size="sm">Version</Label>
              <Select onValueChange={setVersion} value={version}>
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue placeholder="Select Version" />
                </SelectTrigger>
                <SelectContent size="xs">
                  {product.available_versions.map((v) => (
                    <SelectItem size="xs" value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              startDate={new Date(dateRange.start)}
              endDate={new Date(dateRange.end)}
              onChange={(startDate, endDate) => {
                setDateRange({
                  end: endDate.toISOString(),
                  start: startDate.toISOString(),
                });
              }}
              minDate={new Date(computedDateBounds.start)}
              maxDate={new Date(computedDateBounds.end)}
            />
          </div>
          <div className="flex flex-1 flex-col h-0 border rounded overflow-hidden">
            <Chart
              dateBounds={computedDateBounds}
              enableEditing={false}
              chartEntity={chartEntity}
              products={products}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              hoverDate={null}
              onHoverDateChange={() => {}}
              selectedPoint={null}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductPreviewModal;
