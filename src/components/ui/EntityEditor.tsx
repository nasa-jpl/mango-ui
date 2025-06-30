import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import { Layers2, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";
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
  MapEntity,
  MapLayer,
  Section,
  YAxis,
} from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import Entity from "../page/Entity";
import { InputForm } from "./InputForm";
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
  } ${thing.fields.join(", ")} ${(thing.channels || [])
    ?.map((c) => `(${c.id}: ${c.value})`)
    .join(" ")} (v${thing.version})`;
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
    return updateChartLayer({ ...layer, color });
  }, 100);

  const updateChartLayer = (layer: ChartLayer) => {
    const chartEntity: ChartEntity = newEntity;
    const updatedEntity: ChartEntity = {
      ...chartEntity,
      layers: (chartEntity.layers || [])?.map((l) => {
        if (l.id === layer.id) {
          return layer;
        }
        return l;
      }),
    };
    setNewEntity(updatedEntity);
  };

  const onSelectedProductsChange = (newSelectedProducts: SelectedProduct[]) => {
    // Reassign layer products to new selected products
    const entityWithLayers = newEntity as ChartEntity | MapEntity;
    const newLayers: (ChartLayer | MapLayer)[] = [];
    (entityWithLayers.layers || []).forEach((layer) => {
      const oldSelectedProduct = getMatchingSelectedProductForLayer(
        layer,
        selectedProducts
      );
      const newSelectedProduct = getMatchingSelectedProductForLayer(
        layer,
        newSelectedProducts
      );
      // If an old matching selected product exists and a new one does not,
      // check for the existence of the old selected product and if found,
      // update layer to use this new product
      if (oldSelectedProduct && !newSelectedProduct) {
        const matchingNewProduct = newSelectedProducts.find(
          (p) => p.id === oldSelectedProduct.id
        );
        if (matchingNewProduct) {
          newLayers.push({
            ...layer,
            ...matchingNewProduct,
            id: layer.id,
          });
        }
      } else if (newSelectedProduct) {
        // If the layer matches a new selected product, use the new product
        newLayers.push({
          ...layer,
          ...newSelectedProduct,
          id: layer.id,
        });
      }
      // Otherwise we can delete the layer since the associatated product has been deleted
    });
    const updatedEntity = {
      ...entityWithLayers,
      layers: newLayers,
    };
    setNewEntity(updatedEntity);
    setSelectedProducts(newSelectedProducts);
  };

  // TODO break various parts of this component into subcomponents when refactoring to handle multiple entity types
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
              isEditing
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
                <TabsTrigger disabled value="events">
                  Events
                </TabsTrigger>
                <TabsTrigger disabled value="transformations">
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
                    onChange={onSelectedProductsChange}
                    products={products}
                    selectedProducts={selectedProducts}
                  />
                </div>
              </TabsContent>
              <TabsContent value="events">
                <div className="pt-2 text-sm text-muted-foreground">
                  Coming Soon
                </div>
              </TabsContent>
              <TabsContent value="transformations">
                <div className="pt-2 text-sm text-muted-foreground">
                  Coming Soon
                </div>
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
              <Select onValueChange={() => {}} value={entity.type} disabled>
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue id="entity-type" placeholder="Select field" />
                </SelectTrigger>
                <SelectContent size="xs">
                  {entityTypes.sort().map(({ value, label }) => (
                    <SelectItem size="xs" value={value} key={label}>
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
                          label: "",
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
                    ((newEntity as ChartEntity).yAxes || []).length < 1) && (
                    <div className="text-muted-foreground">No y axes</div>
                  )}
                  {(newEntity as ChartEntity).yAxes !== undefined && (
                    <div className="flex-1 flex flex-col gap-6">
                      {(newEntity as ChartEntity).yAxes?.map((yAxis) => (
                        <div className="flex flex-col gap-1" key={yAxis.id}>
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
                            <Tooltip content="Add Layer">
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
                                    color: "#002AFA", // TODO implement smart next color selection here
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
                                <Layers2 />
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
                                    layers: (chartEntity.layers || []).filter(
                                      (layer) => layer.yAxisId !== yAxis.id
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
                                        placeholder="Select product"
                                      />
                                    </SelectTrigger>
                                    <SelectContent size="xs">
                                      {selectedProducts
                                        .sort()
                                        .map((selectedProduct) => (
                                          <SelectItem
                                            key={selectedProduct.id}
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
                                  <Tooltip content="Remove Layer">
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
                                  <Popover>
                                    <Tooltip content="Settings">
                                      <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical size={16} />
                                        </Button>
                                      </PopoverTrigger>
                                    </Tooltip>
                                    <PopoverContent
                                      collisionPadding={{ right: 16 }}
                                    >
                                      <div className="leading-none font-medium mb-4">
                                        Layer Settings
                                      </div>
                                      <div className="flex items-center gap-2 flex-col">
                                        <InputForm
                                          inlineLabelWidth={72}
                                          layout="inline"
                                          formSchema={z.object({
                                            lineWidth: z.coerce
                                              .number()
                                              .min(0)
                                              .max(10),
                                          })}
                                          inputProps={{
                                            type: "number",
                                            step: 0.25,
                                          }}
                                          defaultValue={
                                            (
                                              layer as ChartLayerLine
                                            ).lineWidth?.toString() ?? "1"
                                          }
                                          name="lineWidth"
                                          label="Line Width"
                                          onChange={(value) => {
                                            const chartLayer =
                                              layer as ChartLayerLine;
                                            updateChartLayer({
                                              ...chartLayer,
                                              lineWidth: parseFloat(value),
                                            });
                                          }}
                                        />
                                        <InputForm
                                          inlineLabelWidth={72}
                                          layout="inline"
                                          inputProps={{
                                            type: "number",
                                            step: 0.25,
                                          }}
                                          formSchema={z.object({
                                            pointRadius: z.coerce
                                              .number()
                                              .min(0)
                                              .max(10),
                                          })}
                                          defaultValue={
                                            (
                                              layer as ChartLayerLine
                                            ).pointRadius?.toString() ?? "1.25"
                                          }
                                          name="pointRadius"
                                          label="Point Width"
                                          onChange={(value) => {
                                            const chartLayer =
                                              layer as ChartLayerLine;
                                            updateChartLayer({
                                              ...chartLayer,
                                              pointRadius: parseFloat(value),
                                            });
                                          }}
                                        />
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              ))}
                          </div>
                          {((newEntity as ChartEntity).layers || []).filter(
                            (l) => l.yAxisId === yAxis.id
                          ).length === 0 && (
                            <div className="text-muted-foreground">
                              No layers on axis
                            </div>
                          )}
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
