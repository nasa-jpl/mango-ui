import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@nasa-jpl/stellar-react";
import { debounce } from "lodash-es";
import { Database, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import useResizeObserver from "../../hooks/resizeObserver";
import { Product } from "../../types/api";
import { DateRange } from "../../types/time";
import {
  ChartEntity,
  ChartLayer,
  ChartLayerLine,
  DataLayer,
  EntityType as EntityPlotType,
  Entity as EntityType,
  Section,
  YAxis,
} from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import Entity from "../page/Entity";
import { ProductsSelector } from "./ProductsSelector";
import { Tooltip } from "./Tooltip";

export declare type EntityEditorProps = {
  dateRange: DateRange;
  entity: EntityType;
  onCancel: () => void;
  onDateRangeChange: (dateRange: DateRange) => void;
  onSave: (entity: EntityType, section?: Section) => void;
  products: Product[];
};

export type SelectedProduct = Pick<
  DataLayer,
  | "channels"
  | "dataset"
  | "fields"
  | "instrument"
  | "mission"
  | "version"
  | "id"
>;

const getLabelForSelectedProductOrLayer = (
  thing: SelectedProduct | DataLayer
) => {
  return `${thing.mission} ${thing.instrument} ${
    thing.dataset
  } ${thing.fields.join(", ")} ${(thing.channels || [])?.join(",")} (v${
    thing.version
  })`;
};

const getMatchingSelectedProductForLayer = (
  layer: DataLayer,
  selectedProducts: SelectedProduct[]
) => {
  const layerLabel = getLabelForSelectedProductOrLayer(layer);
  return selectedProducts.find(
    (p) => getLabelForSelectedProductOrLayer(p) === layerLabel
  );
};

const extractEntitySelectedProducts = (entity: EntityType) => {
  if (entity.type === "chart") {
    return ((entity as ChartEntity).layers || [])?.map((layer) => {
      const selectedProduct: SelectedProduct = {
        id: generateUUID(),
        channels: layer.channels,
        fields: layer.fields,
        dataset: layer.dataset,
        mission: layer.mission,
        version: layer.version,
        instrument: layer.instrument,
      };
      return selectedProduct;
    });
  }
  return [];
};

export const EntityEditor = ({
  entity,
  dateRange,
  onCancel,
  onSave,
  onDateRangeChange,
  products,
}: EntityEditorProps) => {
  const [newEntity, setNewEntity] = useState<EntityType>(entity);
  const [entityWidth, setEntityWidth] = useState<number>(0);
  const onResize = useCallback((target: HTMLDivElement) => {
    setEntityWidth(target.getBoundingClientRect().width);
  }, []);
  const resizeObserverRef = useResizeObserver(onResize);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    extractEntitySelectedProducts(entity)
  );

  const entityTypes: { label: string; value: EntityPlotType }[] = [
    { value: "chart", label: "Chart" },
    { value: "downlink-dashboard", label: "Downlink Dashboard" },
    { value: "map", label: "Map" },
    { value: "table", label: "Table" },
    { value: "text", label: "Text" },
  ];

  const debouncedColorChange = debounce((color: string, layer: ChartLayer) => {
    const chartEntity: ChartEntity = newEntity;
    const updatedEntity: ChartEntity = {
      ...chartEntity,
      layers: (chartEntity.layers || [])?.map((l) => {
        if (l.id === layer.id) {
          return {
            ...layer,
            color,
          };
        }
        return l;
      }),
    };
    setNewEntity(updatedEntity);
  }, 100);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      ref={resizeObserverRef}
    >
      <div className="flex justify-between px-6 py-3 bg-white border-t border-b items-center text-base text-muted-foreground">
        Edit Entity
        <div className="flex gap-1">
          <Button variant="outline" onClick={onCancel}>
            Discard Changes
          </Button>
          <Button onClick={() => onSave(newEntity)}>Done</Button>
        </div>
      </div>
      <div className="m-4 flex gap-4 w-[inherit] overflow-hidden flex-1">
        <div
          className="flex gap-4 h-full flex-col"
          /*
            Need to give the container a real width in order for the chart auto sizing to
            function properly when resizing the window. Size is equal to the right sidebar width plus flex spacing.
          */
          style={{ width: `${entityWidth - 384 - 48}px` }}
        >
          <div className="h-[50%]">
            <Entity
              className="h-full"
              entity={newEntity}
              products={products}
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              hoverDate={null}
              onSelectPoint={() => {}}
              onSetProductPreview={() => {}}
              selectedPoint={null}
            />
          </div>
          <div className="h-[50%] p-4 border bg-white rounded">
            <Tabs
              defaultValue="products"
              className="overflow-hidden h-full flex flex-col"
            >
              <TabsList className="w-min">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="transformations">
                  Transformations
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="products"
                className="h-full overflow-auto m-1 mt-4 border p-2 rounded"
              >
                <div className="flex flex-col overflow-auto p-1">
                  <div className="mb-5 text-sm text-muted-foreground">
                    Select any number of products to include in this chart.
                  </div>
                  <ProductsSelector
                    onChange={(newSelectedProducts) => {
                      setSelectedProducts(newSelectedProducts);
                    }}
                    products={products}
                    selectedProducts={selectedProducts}
                  />
                </div>
              </TabsContent>
              <TabsContent value="events">
                <div>Events</div>
              </TabsContent>
              <TabsContent value="transformations">
                <div>Transformations</div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <div className="h-full min-w-96 border bg-white rounded divide-y">
          <div className="p-4">
            <div className="text-base">Entity Options</div>
            <div className="pt-1 text-muted-foreground">
              Select the type of plot and add customizations
            </div>
          </div>
          <div className="p-4 gap-4 flex flex-col">
            <div className="flex flex-col gap-1">
              <Label size="sm" htmlFor="entity-type">
                Entity Type
              </Label>
              <Select onValueChange={() => {}} value={entity.type}>
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue id="entity-type" placeholder="Select field" />
                </SelectTrigger>
                <SelectContent size="xs">
                  {entityTypes.sort().map(({ value, label }) => (
                    <SelectItem size="xs" value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label size="sm">Title</Label>
              <Input
                sizeVariant="xs"
                value={newEntity.title}
                onChange={(e) =>
                  setNewEntity({ ...newEntity, title: e.target.value })
                }
              />
            </div>
          </div>
          <div className="p-4">
            {newEntity.type === "chart" && (
              <div>
                <div className="font-medium mb-4 justify-between flex ">
                  Y Axes
                  <Tooltip content="Add Y Axis">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const chartEntity: ChartEntity = newEntity;
                        const newYAxis: YAxis = {
                          id: generateUUID(),
                          label: "New Axis",
                        };
                        const updatedEntity: ChartEntity = {
                          ...chartEntity,
                          yAxes: (chartEntity.yAxes || []).concat(newYAxis),
                        };
                        setNewEntity(updatedEntity);
                      }}
                    >
                      <Plus />
                    </Button>
                  </Tooltip>
                </div>
                <div className="flex justify-between gap-20 items-center">
                  {((newEntity as ChartEntity).yAxes === undefined ||
                    (newEntity as ChartEntity).yAxes.length < 1) && (
                    <div>No y axes</div>
                  )}
                  {(newEntity as ChartEntity).yAxes !== undefined && (
                    <div className="flex-1 flex flex-col gap-6">
                      {(newEntity as ChartEntity).yAxes?.map((yAxis) => (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center flex-1 gap-1">
                            <Input
                              placeholder="Units used as axis name by default"
                              className="flex-1 w-full"
                              value={yAxis.label}
                              sizeVariant="xs"
                              onChange={(e) => {
                                const chartEntity: ChartEntity = newEntity;
                                const updatedEntity: ChartEntity = {
                                  ...chartEntity,
                                  yAxes: (chartEntity.yAxes || []).map(
                                    (axis) => {
                                      if (axis.id === yAxis.id) {
                                        return {
                                          ...axis,
                                          label: e.target.value,
                                        };
                                      }
                                      return axis;
                                    }
                                  ),
                                };
                                setNewEntity(updatedEntity);
                              }}
                            />
                            <Tooltip content="Add Product">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const chartEntity: ChartEntity = newEntity;
                                  const newLayer: ChartLayerLine = {
                                    dataset: "",
                                    endTime: "",
                                    fields: [],
                                    id: generateUUID(),
                                    instrument: "",
                                    type: "line",
                                    mission: "",
                                    startTime: "",
                                    version: "",
                                    yAxisId: yAxis.id,
                                  };
                                  const updatedEntity: ChartEntity = {
                                    ...chartEntity,
                                    layers: [
                                      ...(chartEntity.layers || []),
                                      newLayer,
                                    ],
                                  };
                                  setNewEntity(updatedEntity);
                                }}
                              >
                                <Database />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Remove Y Axis">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const chartEntity: ChartEntity = newEntity;
                                  // TODO re-associate any existing layers with other axes? What if none exist?
                                  const updatedEntity: ChartEntity = {
                                    ...chartEntity,
                                    yAxes: (chartEntity.yAxes || []).filter(
                                      (axis) => axis.id !== yAxis.id
                                    ),
                                  };
                                  setNewEntity(updatedEntity);
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </Tooltip>
                          </div>
                          <div className="flex flex-col gap-2 border-l ml-1">
                            {((newEntity as ChartEntity).layers || [])
                              .filter((l) => l.yAxisId === yAxis.id)
                              .map((layer) => (
                                <div key={layer.id} className="flex gap-1">
                                  <Select
                                    onValueChange={(value) => {
                                      const selectedProduct =
                                        selectedProducts.find(
                                          (p) => p.id === value
                                        );
                                      const chartEntity: ChartEntity =
                                        newEntity;
                                      const updatedEntity: ChartEntity = {
                                        ...chartEntity,
                                        layers: (chartEntity.layers || [])?.map(
                                          (l) => {
                                            if (l.id === layer.id) {
                                              return {
                                                ...layer,
                                                ...selectedProduct,
                                                id: layer.id,
                                              };
                                            }
                                            return l;
                                          }
                                        ),
                                      };
                                      setNewEntity(updatedEntity);
                                    }}
                                    value={
                                      getMatchingSelectedProductForLayer(
                                        layer,
                                        selectedProducts
                                      )?.id
                                    }
                                  >
                                    <SelectTrigger
                                      size="xs"
                                      className="flex-1 max-w-96 min-w-24 ml-2"
                                    >
                                      <SelectValue
                                        id="entity-type"
                                        placeholder="Select field"
                                      />
                                    </SelectTrigger>
                                    <SelectContent size="xs">
                                      {selectedProducts
                                        .sort()
                                        .map((selectedProduct) => (
                                          <SelectItem
                                            size="xs"
                                            value={selectedProduct.id}
                                          >
                                            {getLabelForSelectedProductOrLayer(
                                              selectedProduct
                                            )}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="w-6 h-6 flex">
                                    <input
                                      type="color"
                                      className="bg-transparent [&::-webkit-color-swatch]:border-transparent [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch-wrapper]:p-0 w-6 h-6 p-1 hover:bg-secondary rounded cursor-pointer"
                                      value={layer.color}
                                      onChange={(e) => {
                                        debouncedColorChange(
                                          e.target.value,
                                          layer
                                        );
                                      }}
                                    />
                                  </div>
                                  <Tooltip content="Remove Product">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const chartEntity: ChartEntity =
                                          newEntity;
                                        const updatedEntity: ChartEntity = {
                                          ...chartEntity,
                                          layers: (
                                            chartEntity.layers || []
                                          ).filter((l) => l.id !== layer.id),
                                        };
                                        setNewEntity(updatedEntity);
                                      }}
                                    >
                                      <Trash2 />
                                    </Button>
                                  </Tooltip>
                                </div>
                              ))}
                          </div>
                          {((newEntity as ChartEntity).layers || []).filter(
                            (l) => l.yAxisId === yAxis.id
                          ).length === 0 && <div>No layers on axis</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityEditor;
