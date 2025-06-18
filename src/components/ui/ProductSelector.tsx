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
  }, [JSON.stringify(selectedProduct)]);

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
  const fields =
    products
      .find(
        (product) =>
          product.id === newSelectedProduct.dataset &&
          product.mission === newSelectedProduct.mission &&
          product.instruments.indexOf(newSelectedProduct.instrument) > -1
      )
      ?.available_fields.filter((field) => field.type === "float") || [];

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
              <SelectValue id="entity-type" placeholder="Select field" />
            </SelectTrigger>
            <SelectContent size="xs">
              {missions.sort().map((mission) => (
                <SelectItem size="xs" value={mission}>
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
              <SelectValue id="entity-type" placeholder="Select field" />
            </SelectTrigger>
            <SelectContent size="xs">
              {instruments.sort().map((instrument) => (
                <SelectItem size="xs" value={instrument}>
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
              })
            }
            value={newSelectedProduct.dataset}
          >
            <SelectTrigger size="xs" className="flex-1 max-w-96 min-w-24">
              <SelectValue id="entity-type" placeholder="Select field" />
            </SelectTrigger>
            <SelectContent size="xs">
              {datasets.sort().map((dataset) => (
                <SelectItem size="xs" value={dataset}>
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
                <SelectItem size="xs" value={field.name}>
                  {field.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <SelectValue id="entity-type" placeholder="Select field" />
            </SelectTrigger>
            <SelectContent size="xs">
              {versions.map((version) => (
                <SelectItem size="xs" value={version}>
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
