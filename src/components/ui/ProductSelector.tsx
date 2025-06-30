import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@nasa-jpl/stellar-react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { Product } from "../../types/api";
import { SelectedProduct } from "./EntityEditor";

export declare type ProductSelectorProps = {
  onChange: (selectedProduct: SelectedProduct) => void;
  products: Product[];
  selectedProduct: SelectedProduct;
};

export const ProductSelector = ({
  onChange,
  products,
  selectedProduct,
}: ProductSelectorProps) => {
  const [newSelectedProduct, setNewSelectedProduct] =
    useState<SelectedProduct>(selectedProduct);

  useEffect(() => {
    setNewSelectedProduct(selectedProduct);
  }, [selectedProduct]);

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
      ...products
        .filter((product) => product.mission === newSelectedProduct.mission)
        .map((product) => product.instruments)
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

  const fields =
    product?.available_fields.filter(
      (field) =>
        (!field.is_channel_id && field.type === "float") || field.type === "int"
    ) || [];

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
          <Label size="sm">Field</Label>
          <Select
            onValueChange={(value) =>
              updateSelectedProduct({
                ...newSelectedProduct,
                fields: [value],
              })
            }
            value={
              newSelectedProduct.fields.length
                ? newSelectedProduct.fields[0]
                : undefined
            }
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select field" />
            </SelectTrigger>
            <SelectContent size="xs">
              {fields.map((field) => (
                <SelectItem size="xs" value={field.name} key={field.name}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
