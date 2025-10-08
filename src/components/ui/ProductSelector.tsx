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
import { Product, ProductField } from "../../types/api";
import { SelectedProduct } from "./EntityEditor";

export declare type ProductSelectorProps = {
  fieldFilter: (field: ProductField) => boolean;
  multiple: boolean;
  onChange: (selectedProduct: SelectedProduct) => void;
  products: Product[];
  selectedProduct: SelectedProduct;
};

export const ProductSelector = ({
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
  const [comboboxOpen2, setComboboxOpen2] = useState(false);

  const updateSelectedProduct = (updatedSelectedProduct: SelectedProduct) => {
    // TODO handle channels
    if (
      (updatedSelectedProduct.mission &&
        updatedSelectedProduct.instrument &&
        updatedSelectedProduct.dataset &&
        updatedSelectedProduct.fields.length &&
        updatedSelectedProduct.version &&
        !updatedSelectedProduct.transforms) ||
      (Array.isArray(updatedSelectedProduct.transforms) &&
        updatedSelectedProduct.transforms.length)
    ) {
      onChange(updatedSelectedProduct);
    }
    setNewSelectedProduct(updatedSelectedProduct);
  };

  // TODO memoize these
  const missions = Object.values(
    products.reduce<{ [key: string]: Product["mission"] }>((acc, product) => {
      if (!acc[product.mission.id]) {
        acc[product.mission.id] = product.mission;
      }
      return acc;
    }, {})
  );
  const instruments = [
    ...new Set(
      products
        .filter((product) => product.mission.id === newSelectedProduct.mission)
        .map((product) => product.instruments)
        .flat()
    ),
  ];
  const datasets = [
    ...new Set(
      products
        .filter(
          (product) =>
            product.mission.id === newSelectedProduct.mission &&
            product.instruments.indexOf(newSelectedProduct.instrument) > -1
        )
        .map((product) => product.id)
    ),
  ];

  const product = products.find(
    (product) =>
      product.id === newSelectedProduct.dataset &&
      product.mission.id === newSelectedProduct.mission &&
      product.instruments.indexOf(newSelectedProduct.instrument) > -1
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
        product.instruments.indexOf(newSelectedProduct.instrument) > -1
    )?.available_versions || [];

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
                              (f) => f !== currentValue
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
                              : "opacity-0"
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
            (c) => c.id === channel.id
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
        {typeof selectedProduct.filter === "string" && (
          <div className="flex flex-col gap-1 min-w-40">
            <Label size="sm">Filter</Label>
            <Input
              placeholder="<field_name>=<value>"
              className="flex-1 w-full"
              value={newSelectedProduct.filter || ""}
              sizeVariant="xs"
              onChange={(e) => {
                updateSelectedProduct({
                  ...newSelectedProduct,
                  filter: e.target.value,
                });
              }}
            />
          </div>
        )}
        {Array.isArray(selectedProduct.transforms) && (
          <div className="flex flex-col gap-1 min-w-40">
            <Label size="sm">Transform Fields</Label>
            <Popover open={comboboxOpen2} onOpenChange={setComboboxOpen2}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen2}
                  className="w-[200px] flex overflow-hidden items-center p-2 justify-between h-[26px]"
                >
                  <div className="block overflow-hidden text-ellipsis">
                    {newSelectedProduct.transformTargets?.length ? (
                      newSelectedProduct.transformTargets.join(", ")
                    ) : (
                      <div className="text-muted-foreground font-normal">
                        All fields transformed
                      </div>
                    )}
                  </div>
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 max-w-fit min-w-fit" align="start">
                <Command className="min-w-fit">
                  <CommandInput
                    placeholder="Search transform fields..."
                    asChild
                  >
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
                            let newFields = [
                              ...(newSelectedProduct.transformTargets || []),
                            ];
                            if (
                              (
                                newSelectedProduct.transformTargets || []
                              ).indexOf(currentValue) > -1
                            ) {
                              newFields = newFields.filter(
                                (f) => f !== currentValue
                              );
                            } else {
                              newFields.push(currentValue);
                            }
                            updateSelectedProduct({
                              ...newSelectedProduct,
                              transformTargets: newFields,
                            });
                          }}
                        >
                          <Check
                            className={cn(
                              "",
                              (
                                newSelectedProduct.transformTargets || []
                              ).indexOf(field.name) > -1
                                ? "opacity-100"
                                : "opacity-0"
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
        )}
      </div>
      {Array.isArray(selectedProduct.transforms) &&
        selectedProduct.transforms.map((transform, index) => {
          return (
            <div className="flex ml-4 items-center gap-1 min-w-40">
              <Label size="sm">Transform {index + 1}</Label>
              <div className="flex flex-col gap-1 min-w-40">
                <Label size="sm">Transform Type</Label>
                <Select
                  onValueChange={(value) => {
                    const existingTransforms = selectedProduct.transforms;
                    existingTransforms[index] = {
                      ...transform,
                      type: value as "self" | "derived",
                    };
                    updateSelectedProduct({
                      ...newSelectedProduct,
                      transforms: existingTransforms,
                    });
                  }}
                  value={transform.type}
                >
                  <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                    <SelectValue
                      id="transform-type"
                      placeholder="Select Transform Type"
                    />
                  </SelectTrigger>
                  <SelectContent size="xs">
                    <SelectItem size="xs" value="self" key="self">
                      Self
                    </SelectItem>
                    <SelectItem size="xs" value="derived" key="derived">
                      Derived
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-40">
                <Label size="sm">Operation</Label>
                <Select
                  onValueChange={(value) => {
                    const newTransform = structuredClone(transform);
                    if (newTransform) {
                      delete newTransform.add;
                      delete newTransform.subtract;
                      delete newTransform.multiply;
                      delete newTransform.divide;
                      newTransform[value] = 0;
                      updateSelectedProduct({
                        ...newSelectedProduct,
                        transforms: (newSelectedProduct.transforms || []).map(
                          (t, i) => {
                            if (i === index) {
                              return newTransform;
                            }
                            return t;
                          }
                        ),
                      });
                      console.log(
                        "newSelectedProduct :>> ",
                        newSelectedProduct
                      );
                    }
                  }}
                  value={
                    typeof transform.add === "number"
                      ? "add"
                      : typeof transform.subtract === "number"
                      ? "subtract"
                      : typeof transform.divide === "number"
                      ? "divide"
                      : typeof transform.multiply === "number"
                      ? "multiply"
                      : ""
                  }
                >
                  <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
                    <SelectValue
                      id="transform-type"
                      placeholder="Select Transform Type"
                    />
                  </SelectTrigger>
                  <SelectContent size="xs">
                    <SelectItem size="xs" value="add" key="add">
                      Add
                    </SelectItem>
                    <SelectItem size="xs" value="subtract" key="subtract">
                      Subtract
                    </SelectItem>
                    <SelectItem size="xs" value="multiply" key="multiply">
                      Multiply
                    </SelectItem>
                    <SelectItem size="xs" value="divide" key="divide">
                      Divide
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {transform.type === "self" && (
                <div className="flex flex-col gap-1 min-w-40">
                  <Label size="sm">Value</Label>
                  <Input
                    className=""
                    type="number"
                    value={
                      transform.add ??
                      transform.subtract ??
                      transform.multiply ??
                      (transform.divide || 0)
                    }
                    sizeVariant="xs"
                    onChange={(e) => {
                      const activeKey =
                        typeof transform.add === "number"
                          ? "add"
                          : typeof transform.subtract === "number"
                          ? "subtract"
                          : typeof transform.multiply === "number"
                          ? "multiply"
                          : typeof transform.divide === "number"
                          ? "divide"
                          : null;
                      if (activeKey) {
                        const newTransforms =
                          structuredClone(selectedProduct.transforms) || [];
                        newTransforms[index][activeKey] = parseFloat(
                          e.target.value
                        );
                        console.log(
                          "newTransforms :>> ",
                          newTransforms,
                          e.target.value
                        );
                        updateSelectedProduct({
                          ...newSelectedProduct,
                          transforms: newTransforms,
                        });
                      }
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export const Content = TabsPrimitive.Content;
