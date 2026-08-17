import { Check, ChevronsUpDown } from "lucide-react";

import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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
} from "@nasa-jpl/stellar-react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { DataResponseDataEntry, Product, ProductField } from "../../types/api";
import { DateRange } from "../../types/time";
import { getData } from "../../utilities/api";
import {
  isWithinSubsetVersionMaxRange,
  SUBSET_VERSION_MAX_RANGE_DAYS,
} from "../../utilities/time";
import { SelectedProduct } from "./EntityEditor";
import {
  isSelectedProductComplete,
  shouldFetchSubsetVersionCount,
} from "./entity-editor-utils";

// Sentinel value for the "All" subset version option (no filter applied)
const ALL_SUBSET_VERSIONS = "__all__";

export declare type ProductSelectorProps = {
  dateRange?: DateRange;
  fieldFilter: (field: ProductField) => boolean;
  multiple: boolean;
  onChange: (selectedProduct: SelectedProduct) => void;
  products: Product[];
  selectedProduct: SelectedProduct;
};

export const ProductSelector = ({
  dateRange,
  onChange,
  products,
  selectedProduct,
  fieldFilter,
  multiple = false,
}: ProductSelectorProps) => {
  const [newSelectedProduct, setNewSelectedProduct] =
    useState<SelectedProduct>(selectedProduct);

  useEffect(() => {
    setNewSelectedProduct(selectedProduct);
  }, [selectedProduct]);

  const [comboboxOpen, setComboboxOpen] = useState(false);

  const updateSelectedProduct = (updatedSelectedProduct: SelectedProduct) => {
    // TODO handle channels
    if (isSelectedProductComplete(updatedSelectedProduct)) {
      onChange(updatedSelectedProduct);
    }
    setNewSelectedProduct(updatedSelectedProduct);
  };

  // TODO memoize these
  const missions = [
    ...new Map(products.map((p) => [p.mission.id, p.mission])).values(),
  ];

  const instruments = [
    ...new Set(
      products
        .filter((product) => product.mission.id === newSelectedProduct.mission)
        .map((product) => product.instruments)
        .flat(),
    ),
  ];
  const datasets = [
    ...new Set(
      products
        .filter(
          (product) =>
            product.mission.id === newSelectedProduct.mission &&
            product.instruments.indexOf(newSelectedProduct.instrument) > -1,
        )
        .map((product) => product.id),
    ),
  ];

  const product = products.find(
    (product) =>
      product.id === newSelectedProduct.dataset &&
      product.mission.id === newSelectedProduct.mission &&
      product.instruments.indexOf(newSelectedProduct.instrument) > -1,
  );
  const fields = product?.available_fields.filter(fieldFilter) || [];

  const channels = product?.available_fields
    .filter((f) => f.is_channel_id)
    .map((f) => ({ id: f.name, values: f.enum_values || [] }));

  const versions =
    products.find(
      (product) =>
        product.id === newSelectedProduct.dataset &&
        product.mission.id === newSelectedProduct.mission &&
        product.instruments.indexOf(newSelectedProduct.instrument) > -1,
    )?.available_versions || [];

  // Check if product has a subset_version field
  const hasSubsetVersionField = product?.available_fields.some(
    (f) => f.name === "subset_version",
  );

  // Update the selected product's hasSubsetVersionField flag when it changes
  useEffect(() => {
    if (
      newSelectedProduct.hasSubsetVersionField !== hasSubsetVersionField &&
      (newSelectedProduct.mission ||
        newSelectedProduct.instrument ||
        newSelectedProduct.dataset)
    ) {
      updateSelectedProduct({
        ...newSelectedProduct,
        hasSubsetVersionField,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSubsetVersionField]);

  // Subset version filtering is only available over short time ranges
  const subsetVersionAvailable =
    !!dateRange &&
    isWithinSubsetVersionMaxRange(dateRange.start, dateRange.end);

  // Unique subset_version values available for the current selection
  const [subsetVersions, setSubsetVersions] = useState<string[]>([]);

  // Fetch the available subset versions when the product has the field, the
  // selection is complete, and the time range is short enough for subset
  // version filtering
  useEffect(() => {
    if (
      !shouldFetchSubsetVersionCount(
        newSelectedProduct,
        hasSubsetVersionField,
        dateRange,
      )
    ) {
      setSubsetVersions([]);
      return;
    }

    const { json, cancel } = getData(
      newSelectedProduct.mission,
      newSelectedProduct.dataset,
      newSelectedProduct.instrument,
      newSelectedProduct.version,
      ["subset_version"],
      newSelectedProduct.channels ?? [],
      dateRange!.start,
      dateRange!.end,
      // subset_version only exists in full-resolution data; without an
      // explicit factor the server may pick a downsampled resolution and
      // reject the request
      1,
    );

    json()
      .then((data) => {
        const subsetVersionSet = new Set<string>();
        (data?.data || []).forEach((point: DataResponseDataEntry) => {
          const subsetVersionValue = point.subset_version?.value;
          if (subsetVersionValue !== undefined && subsetVersionValue !== null) {
            subsetVersionSet.add(String(subsetVersionValue));
          }
        });
        setSubsetVersions(
          [...subsetVersionSet].sort((a, b) =>
            a.localeCompare(b, "en", { numeric: true }),
          ),
        );
      })
      .catch((error: unknown) => {
        if ((error as Error)?.name === "AbortError") {
          return;
        }
        setSubsetVersions([]);
        console.error("Error fetching subset versions:", error);
      });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasSubsetVersionField,
    subsetVersionAvailable,
    dateRange?.start,
    dateRange?.end,
    newSelectedProduct.mission,
    newSelectedProduct.instrument,
    newSelectedProduct.dataset,
    newSelectedProduct.version,
  ]);

  // The subset version currently applied via the product's filter, if any
  const selectedSubsetVersion = (newSelectedProduct.filter || [])
    .find((f) => f.trim().startsWith("subset_version="))
    ?.split("=")[1]
    ?.trim();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex flex-col gap-1">
          <Label size="sm">Mission</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({
                ...newSelectedProduct,
                mission: value,
              })
            }
            value={newSelectedProduct.mission}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select mission" />
            </SelectTrigger>
            <SelectContent size="xs">
              {missions.sort().map((mission) => (
                <SelectItem size="xs" value={mission.id} key={mission.id}>
                  {mission.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label size="sm">Instrument</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({
                ...newSelectedProduct,
                instrument: value,
              })
            }
            value={newSelectedProduct.instrument}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select instrument" />
            </SelectTrigger>
            <SelectContent size="xs">
              {instruments.sort().map((instrument) => (
                <SelectItem size="xs" value={instrument} key={instrument}>
                  {instrument}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label size="sm">Dataset</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({
                ...newSelectedProduct,
                dataset: value,
                fields: [],
                channels: [],
                version: "",
              })
            }
            value={newSelectedProduct.dataset}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent size="xs">
              {datasets.sort().map((dataset) => (
                <SelectItem size="xs" value={dataset} key={dataset}>
                  {dataset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label size="sm">{multiple ? "Field(s)" : "Field"}</Label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-[200px] flex overflow-hidden items-center p-2 justify-between h-[26px]"
              >
                <div className="block overflow-hidden text-ellipsis">
                  {newSelectedProduct.fields.length ? (
                    newSelectedProduct.fields.join(", ")
                  ) : (
                    <div className="text-muted-foreground font-normal">
                      Select {multiple ? "field(s)" : "field"}
                    </div>
                  )}
                </div>
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 max-w-fit min-w-fit" align="start">
              <Command className="min-w-fit">
                <CommandInput placeholder="Search fields..." asChild>
                  <Input
                    className="border-none h-8 focus-visible:outline-none focus-visible:ring-0 text-xs"
                    sizeVariant="sm"
                  />
                </CommandInput>
                <CommandList className="min-w-fit">
                  <CommandEmpty className="py-4 text-center text-xs">
                    No field found.
                  </CommandEmpty>
                  <CommandGroup className="min-w-fit">
                    {fields.map((field) => (
                      <CommandItem
                        className="text-xs min-w-fit"
                        key={field.name}
                        value={field.name}
                        onSelect={(currentValue) => {
                          if (!multiple) {
                            updateSelectedProduct({
                              ...newSelectedProduct,
                              fields: [currentValue],
                            });
                            setComboboxOpen(false);
                            return;
                          }

                          let newFields = [...newSelectedProduct.fields];
                          if (
                            newSelectedProduct.fields.indexOf(currentValue) > -1
                          ) {
                            newFields = newFields.filter(
                              (f) => f !== currentValue,
                            );
                          } else {
                            newFields.push(currentValue);
                          }
                          updateSelectedProduct({
                            ...newSelectedProduct,
                            fields: newFields,
                          });
                        }}
                      >
                        <Check
                          className={cn(
                            "",
                            newSelectedProduct.fields.indexOf(field.name) > -1
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex gap-1 whitespace-nowrap">
                          {field.name}
                          <div className="text-muted-foreground">
                            {field.unit} ({field.type})
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {(channels || []).map((channel) => {
          const matchingChannel = (selectedProduct.channels || []).find(
            (c) => c.id === channel.id,
          );
          return (
            <div className="flex flex-col gap-1">
              <Label size="sm">{channel.id}</Label>
              <Select
                onValueChange={(value) =>
                  updateSelectedProduct({
                    ...newSelectedProduct,
                    channels: (channels || []).map((c) => {
                      // Update this channel
                      if (c.id === channel.id) {
                        return { id: c.id, value };
                      }
                      // Update all other channels
                      const matchingSelectedProductChannel = (
                        newSelectedProduct.channels || []
                      ).find((_c) => _c.id === c.id);
                      return {
                        id: c.id,
                        value: "",
                        ...matchingSelectedProductChannel,
                      };
                    }),
                  })
                }
                value={matchingChannel?.value}
              >
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue id="entity-type" placeholder="Select value" />
                </SelectTrigger>
                <SelectContent size="xs">
                  {channel.values
                    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
                    .map((c) => (
                      <SelectItem size="xs" value={c} key={c}>
                        {c}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
        <div className="flex flex-col gap-1">
          <Label size="sm">Version</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({
                ...newSelectedProduct,
                version: value,
              })
            }
            value={newSelectedProduct.version}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select version" />
            </SelectTrigger>
            <SelectContent size="xs">
              {versions.map((version) => (
                <SelectItem size="xs" value={version} key={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasSubsetVersionField &&
          subsetVersionAvailable &&
          subsetVersions.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label size="sm">Subset Version</Label>
              <Select
                onValueChange={(value) => {
                  // Applied as a subset_version=<value> filter on the layer
                  const otherFilters = (newSelectedProduct.filter || []).filter(
                    (f) => !f.trim().startsWith("subset_version="),
                  );
                  const updated = { ...newSelectedProduct };
                  if (value === ALL_SUBSET_VERSIONS) {
                    if (Array.isArray(newSelectedProduct.filter)) {
                      updated.filter = otherFilters;
                    }
                  } else {
                    updated.filter = [
                      ...otherFilters,
                      `subset_version=${value}`,
                    ];
                  }
                  updateSelectedProduct(updated);
                }}
                value={selectedSubsetVersion ?? ALL_SUBSET_VERSIONS}
              >
                <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent size="xs">
                  <SelectItem size="xs" value={ALL_SUBSET_VERSIONS}>
                    All
                  </SelectItem>
                  {subsetVersions.map((subsetVersion) => (
                    <SelectItem
                      size="xs"
                      value={subsetVersion}
                      key={subsetVersion}
                    >
                      {subsetVersion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        {Array.isArray(selectedProduct.filter) && (
          <div className="flex flex-col gap-1 min-w-40">
            <Label size="sm">Filter</Label>
            <Input
              placeholder="<field_name>=<value>, <field_name>=<value>"
              className="flex-1 w-full"
              value={(newSelectedProduct.filter || []).join(", ")}
              sizeVariant="xs"
              onChange={(e) => {
                const value = e.target.value;
                updateSelectedProduct({
                  ...newSelectedProduct,
                  filter: value
                    .split(",")
                    .map((f) => f.trim())
                    .filter((f) => f.length > 0),
                });
              }}
            />
          </div>
        )}
      </div>
      {hasSubsetVersionField &&
        !subsetVersionAvailable &&
        selectedSubsetVersion !== undefined && (
          <div className="text-xs text-amber-600">
            Subset versions are unavailable for time ranges beyond{" "}
            {SUBSET_VERSION_MAX_RANGE_DAYS} days. Showing data for all subset
            versions.
          </div>
        )}
    </div>
  );
};

export const Content = TabsPrimitive.Content;
