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

  const updateSelectedProduct = (updatedSelectedProduct: SelectedProduct) => {
    // TODO handle channels
    if (
      updatedSelectedProduct.mission &&
      updatedSelectedProduct.instrument &&
      updatedSelectedProduct.dataset &&
      updatedSelectedProduct.fields.length &&
      updatedSelectedProduct.version
    ) {
      onChange(updatedSelectedProduct);
    }
    setNewSelectedProduct(updatedSelectedProduct);
  };

  // TODO memoize these
  const missions = [...new Set(products.map((product) => product.mission))];
  const instruments = [
    ...new Set(
      products
        .filter((product) => product.mission === newSelectedProduct.mission)
        .map((product) => product.instruments)
        .flat()
    ),
  ];
  const datasets = [
    ...new Set(
      products
        .filter(
          (product) =>
            product.mission === newSelectedProduct.mission &&
            product.instruments.indexOf(newSelectedProduct.instrument) > -1
        )
        .map((product) => product.id)
    ),
  ];

  const product = products.find(
    (product) =>
      product.id === newSelectedProduct.dataset &&
      product.mission === newSelectedProduct.mission &&
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
        product.mission === newSelectedProduct.mission &&
        product.instruments.indexOf(newSelectedProduct.instrument) > -1
    )?.available_versions || [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex flex-col gap-1">
          <Label size="sm">Mission</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({ ...newSelectedProduct, mission: value })
            }
            value={newSelectedProduct.mission}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select mission" />
            </SelectTrigger>
            <SelectContent size="xs">
              {missions.sort().map((mission) => (
                <SelectItem size="xs" value={mission} key={mission}>
                  {mission}
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
      </div>
    </div>
  );
};

export const Content = TabsPrimitive.Content;
