import {
  Button,
  Checkbox,
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
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import useResizeObserver from "../../hooks/resizeObserver";
import { Product, ProductField } from "../../types/api";
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
  TableColumn,
  TableEntity,
  YAxis,
} from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import {
  createDataLayer,
  createEntity,
  isChartEntity,
  isTableEntity,
} from "../../utilities/view";
import Entity from "../page/Entity";
import { InputForm } from "./InputForm";
import ProductsSelector from "./ProductsSelector";
import { Tooltip } from "./Tooltip";

export declare type EntityEditorProps = {
  dateBounds: DateRange;
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
  | "filter"
  | "instrument"
  | "mission"
  | "version"
  | "id"
> & {
  hasSubsetVersionField?: boolean;
  subsetVersionCount?: number;
};

const separator = "----";

const getLabelForSelectedProductOrLayer = (
  thing: SelectedProduct | DataLayer,
  fields?: string[]
) => {
  return `${thing.mission} ${thing.instrument} ${thing.dataset} ${(
    fields || thing.fields
  ).join(", ")} ${(thing.channels || [])
    ?.map((c) => `(${c.id}: ${c.value})`)
    .join(" ")} (v${thing.version}) ${
    typeof thing.filter === "string" ? `filter: ${thing.filter}` : ""
  }`;
};

// Returns the layer containing the selected product
const getMatchingSelectedProductForLayer = (
  layer: DataLayer,
  selectedProducts: SelectedProduct[],
  fields?: string[]
): SelectedProduct | undefined => {
  return selectedProducts.find(
    (p) =>
      getLabelForSelectedProductOrLayer(p, fields || p.fields) ===
      getLabelForSelectedProductOrLayer(layer, fields || layer.fields)
  );
};

const extractEntitySelectedProducts = (
  entity: EntityType
): SelectedProduct[] => {
  const layers = (entity as ChartEntity | TableEntity).layers || [];
  return layers.map((layer) => {
    return {
      id: generateUUID(),
      channels: layer.channels,
      fields: layer.fields,
      dataset: layer.dataset,
      mission: layer.mission,
      version: layer.version,
      instrument: layer.instrument,
      ...(typeof layer.filter === "string" ? { filter: layer.filter } : null),
    } as SelectedProduct;
  });
};

export const EntityEditor = ({
  entity,
  dateRange,
  dateBounds,
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
  const [prevSelectedProducts, setPrevSelectedProducts] = useState<
    SelectedProduct[]
  >([]);

  const productsFieldFilter = useCallback(
    (field: ProductField) => {
      if (newEntity.type === "chart") {
        return field.type === "float" || field.type === "int";
      }
      return true;
    },
    [newEntity.type]
  );

  const entityTypes: {
    disabled: boolean;
    label: string;
    value: EntityPlotType;
  }[] = [
    { value: "chart", label: "Chart", disabled: false },
    { value: "table", label: "Table", disabled: false },
    // {
    //   value: "downlink-dashboard",
    //   label: "Downlink Dashboard",
    //   disabled: true,
    // },
    // { value: "map", label: "Map", disabled: true },
    // { value: "text", label: "Text", disabled: true },
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

  const onSelectedProductsChange = useCallback(
    (newSelectedProducts: SelectedProduct[]) => {
      setPrevSelectedProducts(selectedProducts);
      setSelectedProducts(newSelectedProducts);
    },
    [selectedProducts]
  );

  useEffect(() => {
    // Reassign layer products to new selected products
    const entityWithLayers = newEntity as ChartEntity | MapEntity | TableEntity;
    const newLayers: (ChartLayer | MapLayer | TableEntity)[] = [];
    let newTableColumns: TableColumn[] = [];
    if (isTableEntity(entityWithLayers)) {
      newTableColumns = entityWithLayers.columns;
    }
    (entityWithLayers.layers || []).forEach((layer) => {
      const oldSelectedProduct = getMatchingSelectedProductForLayer(
        layer,
        prevSelectedProducts
      );
      const newSelectedProduct = getMatchingSelectedProductForLayer(
        layer,
        selectedProducts
      );
      // If an old matching selected product exists and a new one does not,
      // check for the existence of the old selected product and if found,
      // update layer to use this new product
      if (oldSelectedProduct && !newSelectedProduct) {
        const matchingNewProduct = selectedProducts.find(
          (p) => p.id === oldSelectedProduct.id
        );
        if (matchingNewProduct) {
          const newLayer = {
            ...layer,
            ...matchingNewProduct,
            id: layer.id,
          };
          if (typeof matchingNewProduct.filter !== "string") {
            delete newLayer.filter;
          }
          newLayers.push(newLayer);
          newTableColumns = newTableColumns.map((c) => {
            if (c.layerId === layer.id) {
              return { ...c, field: matchingNewProduct.fields[0] };
            }
            return c;
          });
        }
      } else if (newSelectedProduct) {
        // If the layer matches a new selected product, use the new product
        const newLayer = {
          ...layer,
          ...newSelectedProduct,
          id: layer.id,
        };
        if (typeof newSelectedProduct.filter !== "string") {
          delete newLayer.filter;
        }
        newLayers.push(newLayer);
      }
      // Otherwise we can delete the layer since the associated product has been deleted
    });
    const updatedEntity = {
      ...entityWithLayers,
      layers: newLayers,
    };
    if (isTableEntity(updatedEntity)) {
      updatedEntity.columns = newTableColumns;
    }
    setNewEntity(updatedEntity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProducts, prevSelectedProducts]);

  function handleEntityTypeChange(type: EntityPlotType) {
    // If switching from table to anything else, split up the selected products with multiple fields
    // into selected products with single fields
    if (newEntity.type === "table" && type !== "table") {
      const newSelectedProducts: SelectedProduct[] = [];
      selectedProducts.forEach((selectedProduct) => {
        selectedProduct.fields.forEach((field) => {
          newSelectedProducts.push({
            ...selectedProduct,
            fields: [field],
            id: generateUUID(),
          });
        });
      });
      setSelectedProducts(newSelectedProducts);
    }
    setNewEntity(
      createEntity({
        id: newEntity.id,
        type,
        title: newEntity.title,
        syncWithPageDateRange: newEntity.syncWithPageDateRange,
        showHeader: newEntity.showHeader,
        dateRange: newEntity.dateRange,
      })
    );
  }

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
              enableEditing={false}
              className="h-full"
              entity={newEntity}
              products={products}
              dateRange={dateRange}
              dateBounds={dateBounds}
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
                    dateRange={dateRange}
                    onChange={onSelectedProductsChange}
                    products={products}
                    selectedProducts={selectedProducts}
                    fieldFilter={productsFieldFilter}
                    multiple={newEntity.type === "table"}
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
        <div className="h-full min-w-96 border bg-white rounded divide-y flex flex-col">
          <div className="p-4">
            <div className="text-base">Entity Options</div>
            <div className="pt-1 text-muted-foreground">
              Select the type of plot and add customizations
            </div>
          </div>
          <div className="overflow-auto">
            <div className="p-4 gap-4 flex flex-col">
              <div className="flex flex-col gap-1">
                <Label size="sm" htmlFor="entity-type">
                  Entity Type
                </Label>
                <Select
                  onValueChange={handleEntityTypeChange}
                  value={newEntity.type}
                >
                  <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                    <SelectValue id="entity-type" placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent size="xs">
                    {entityTypes.sort().map(({ value, label, disabled }) => (
                      <SelectItem
                        size="xs"
                        value={value}
                        key={label}
                        disabled={disabled}
                      >
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
            <div>
              {isChartEntity(newEntity) && (
                <div className="flex gap-6 flex-col divide-y">
                  <div className="p-4 flex gap-2 flex-col">
                    <div className="font-medium h-6 justify-between flex">
                      Y Axes
                      <Tooltip content="Add Y Axis">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newYAxis: YAxis = {
                              id: generateUUID(),
                              label: "",
                            };
                            const updatedEntity = {
                              ...newEntity,
                              yAxes: (newEntity.yAxes || []).concat(newYAxis),
                            };
                            setNewEntity(updatedEntity);
                          }}
                        >
                          <Plus />
                        </Button>
                      </Tooltip>
                    </div>
                    <div className="flex justify-between items-center">
                      {(newEntity.yAxes === undefined ||
                        (newEntity.yAxes || []).length < 1) && (
                        <div className="text-muted-foreground">No y axes</div>
                      )}
                      {newEntity.yAxes !== undefined && (
                        <div className="flex-1 flex flex-col gap-6">
                          {newEntity.yAxes?.map((yAxis) => (
                            <div className="flex flex-col gap-1" key={yAxis.id}>
                              <div className="flex items-center flex-1 gap-1">
                                <Input
                                  placeholder="Axis name (defaults to units)"
                                  className="flex-1 w-full"
                                  value={yAxis.label}
                                  sizeVariant="xs"
                                  onChange={(e) => {
                                    const updatedEntity = {
                                      ...newEntity,
                                      yAxes: (newEntity.yAxes || []).map(
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
                                      const updatedEntity = {
                                        ...newEntity,
                                        layers: [
                                          ...(newEntity.layers || []),
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
                                      // TODO re-associate any existing layers with other axes? What if none exist?
                                      const updatedEntity = {
                                        ...newEntity,
                                        yAxes: (newEntity.yAxes || []).filter(
                                          (axis) => axis.id !== yAxis.id
                                        ),
                                        layers: (newEntity.layers || []).filter(
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
                                {(newEntity.layers || [])
                                  .filter((l) => l.yAxisId === yAxis.id)
                                  .map((layer) => (
                                    <div key={layer.id} className="flex flex-col gap-1">
                                      <div className="flex gap-1">
                                        <Select
                                          onValueChange={(value) => {
                                            const selectedProduct =
                                              selectedProducts.find(
                                                (p) => p.id === value
                                              );
                                            const updatedEntity = {
                                              ...newEntity,
                                              layers: (
                                                newEntity.layers || []
                                              )?.map((l) => {
                                                if (l.id === layer.id) {
                                                  return {
                                                    ...layer,
                                                    ...selectedProduct,
                                                    id: layer.id,
                                                  };
                                                }
                                                return l;
                                              }),
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
                                                    selectedProduct,
                                                    [selectedProduct.fields[0]]
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
                                                ).filter(
                                                  (l) => l.id !== layer.id
                                                ),
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
                                          <div className="leading-none font-medium h-6">
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
                                                ).pointRadius?.toString() ??
                                                "1.25"
                                              }
                                              name="pointRadius"
                                              label="Point Width"
                                              onChange={(value) => {
                                                const chartLayer =
                                                  layer as ChartLayerLine;
                                                updateChartLayer({
                                                  ...chartLayer,
                                                  pointRadius:
                                                    parseFloat(value),
                                                });
                                              }}
                                            />
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                      </div>
                                      {((layer as unknown as { subsetVersionCount?: number }).subsetVersionCount ?? 0) > 0 && (
                                        <div className="text-xs text-muted-foreground ml-2">
                                          {(layer as unknown as { subsetVersionCount: number }).subsetVersionCount} subset version{((layer as unknown as { subsetVersionCount: number }).subsetVersionCount) === 1 ? "" : "s"}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                              </div>
                              {(newEntity.layers || []).filter(
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
                </div>
              )}
              {isTableEntity(newEntity) && (
                <div className="flex gap-6 flex-col divide-y">
                  <div className="p-4 gap-2 flex flex-col">
                    <div className="font-medium h-6 justify-between flex ">
                      Table Options
                    </div>
                    <div className="flex gap-2 items-center">
                      <Checkbox
                        id="apply-field-thresholds"
                        checked={newEntity.applyThresholds}
                        onCheckedChange={(checked) => {
                          const updatedEntity = {
                            ...newEntity,
                            applyThresholds: checked as boolean,
                          };
                          setNewEntity(updatedEntity);
                        }}
                      />
                      <Label size="sm" htmlFor="apply-field-thresholds">
                        Apply field thresholds
                      </Label>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Checkbox
                        id="table-compact"
                        checked={newEntity.compact}
                        onCheckedChange={(checked) => {
                          const updatedEntity = {
                            ...newEntity,
                            compact: checked as boolean,
                          };
                          setNewEntity(updatedEntity);
                        }}
                      />
                      <Label size="sm" htmlFor="table-compact">
                        Compact
                      </Label>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Checkbox
                        id="fitToGridWidth"
                        checked={newEntity.fitToGridWidth}
                        onCheckedChange={(checked) => {
                          const updatedEntity: TableEntity = {
                            ...newEntity,
                            fitToGridWidth: checked as boolean,
                          };
                          setNewEntity(updatedEntity);
                        }}
                      />
                      <Label size="sm" htmlFor="fitToGridWidth">
                        Fit columns to container
                      </Label>
                    </div>
                  </div>

                  <div className="p-4 gap-2 flex flex-col">
                    <div className="font-medium h-6 justify-between flex ">
                      Columns
                      <Tooltip content="Add Column">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newColumn: TableColumn = {
                              field: "",
                              id: generateUUID(),
                              layerId: "",
                              label: "",
                            };
                            const updatedEntity = {
                              ...newEntity,
                              columns: (newEntity.columns || []).concat(
                                newColumn
                              ),
                            };
                            setNewEntity(updatedEntity);
                          }}
                        >
                          <Plus />
                        </Button>
                      </Tooltip>
                    </div>
                    <div className="flex justify-between items-center">
                      {newEntity.columns.length < 1 && (
                        <div className="text-muted-foreground">No columns</div>
                      )}
                      {newEntity.columns.length > 0 && (
                        <div className="flex-1 flex flex-col gap-6">
                          {newEntity.columns.map((column, columnIndex) => {
                            const columnLayer = newEntity.layers.find(
                              (l) => l.id === column.layerId
                            );
                            return (
                              <div
                                className="flex gap-1 items-baseline"
                                key={column.id}
                              >
                                <div className="">{columnIndex}.</div>
                                <div className="flex flex-col flex-1 gap-1">
                                  <div className="flex items-center flex-1 gap-1">
                                    <Input
                                      placeholder="Column name (defaults to field and units)"
                                      className="flex-1 w-full min-h-6"
                                      value={column.label}
                                      sizeVariant="xs"
                                      onChange={(e) => {
                                        const updatedEntity = {
                                          ...newEntity,
                                          columns: (
                                            newEntity.columns || []
                                          ).map((c) => {
                                            if (column.id === c.id) {
                                              return {
                                                ...c,
                                                label: e.target.value,
                                              };
                                            }
                                            return c;
                                          }),
                                        };
                                        setNewEntity(updatedEntity);
                                      }}
                                    />
                                    <Tooltip content="Remove Column">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          const updatedEntity = {
                                            ...newEntity,
                                            columns: newEntity.columns.filter(
                                              (col) => col.id !== column.id
                                            ),
                                            layers: newEntity.layers.filter(
                                              (layer) => {
                                                // Remove the matching layer if it is not in use by any other column
                                                return (
                                                  layer.id !== column.layerId ||
                                                  newEntity.columns.find(
                                                    (c) =>
                                                      c.layerId === layer.id &&
                                                      c.id !== column.id
                                                  )
                                                );
                                              }
                                            ),
                                          };
                                          setNewEntity(updatedEntity);
                                        }}
                                      >
                                        <Trash2 />
                                      </Button>
                                    </Tooltip>
                                  </div>
                                  <Select
                                    onValueChange={(value) => {
                                      const [id, field] =
                                        value.split(separator);
                                      const selectedProduct =
                                        selectedProducts.find(
                                          (p) => p.id === id
                                        );
                                      if (!selectedProduct) {
                                        return;
                                      }
                                      let computedColumnLayer = columnLayer;
                                      const updatedEntity = { ...newEntity };
                                      // Create a new layer for this product if it does not already exist
                                      // or if a matching one cannot be found
                                      computedColumnLayer =
                                        updatedEntity.layers.find((l) => {
                                          return (
                                            l.mission ===
                                              selectedProduct.mission &&
                                            l.dataset ===
                                              selectedProduct.dataset &&
                                            l.instrument ===
                                              selectedProduct.instrument &&
                                            (l.channels || []).join(",") ===
                                              (
                                                selectedProduct.channels || []
                                              ).join(",") &&
                                            l.version ===
                                              selectedProduct.version
                                          );
                                        });

                                      if (!computedColumnLayer) {
                                        computedColumnLayer = createDataLayer({
                                          ...selectedProduct,
                                          id: generateUUID(),
                                        });
                                        updatedEntity.layers =
                                          updatedEntity.layers.concat(
                                            computedColumnLayer
                                          );
                                      } else {
                                        // Update the existing layer with the new field
                                        updatedEntity.layers =
                                          updatedEntity.layers.map((l) => {
                                            if (
                                              computedColumnLayer &&
                                              l.id === computedColumnLayer.id
                                            ) {
                                              return {
                                                ...computedColumnLayer,
                                                ...selectedProduct,
                                                fields: [
                                                  ...new Set(
                                                    computedColumnLayer.fields.concat(
                                                      selectedProduct?.fields ||
                                                        []
                                                    )
                                                  ),
                                                ],
                                                id: computedColumnLayer.id,
                                              };
                                            }
                                            return l;
                                          });
                                      }
                                      updatedEntity.columns =
                                        updatedEntity.columns.map((col) => {
                                          if (col.id === column.id) {
                                            col = {
                                              ...col,
                                              field,
                                              layerId: computedColumnLayer.id,
                                            };
                                          }
                                          return col;
                                        });
                                      setNewEntity(updatedEntity);
                                    }}
                                    value={
                                      columnLayer
                                        ? `${
                                            getMatchingSelectedProductForLayer(
                                              columnLayer,
                                              selectedProducts,
                                              [column.field]
                                            )?.id
                                          }${separator}${column.field}`
                                        : ""
                                    }
                                  >
                                    <SelectTrigger
                                      size="xs"
                                      className="flex-1 max-w-96 min-w-24"
                                    >
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent size="xs">
                                      {selectedProducts
                                        .sort()
                                        .map((selectedProduct) =>
                                          selectedProduct.fields.map((f) => {
                                            const value = `${selectedProduct.id}${separator}${f}`;
                                            return (
                                              <SelectItem
                                                key={value}
                                                size="xs"
                                                value={value}
                                              >
                                                {getLabelForSelectedProductOrLayer(
                                                  selectedProduct,
                                                  [f]
                                                )}
                                              </SelectItem>
                                            );
                                          })
                                        )}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityEditor;
