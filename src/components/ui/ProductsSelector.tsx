import { Button } from "@nasa-jpl/stellar-react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Copy, Trash2 } from "lucide-react";
import { Product } from "../../types/api";
import { generateUUID } from "../../utilities/generic";
import { SelectedProduct } from "./EntityEditor";
import { ProductSelector } from "./ProductSelector";
import { Tooltip } from "./Tooltip";

export declare type ProductsSelectorProps = {
  onChange: (selectedProducts: SelectedProduct[]) => void;
  products: Product[];
  selectedProducts: SelectedProduct[];
};

export const ProductsSelector = ({
  onChange,
  products,
  selectedProducts,
}: ProductsSelectorProps) => {
  return (
    <div className="flex flex-col gap-4">
      {selectedProducts.map((product, i) => (
        <div className="flex gap-2 items-end" key={product.id}>
          <ProductSelector
            selectedProduct={product}
            products={products}
            onChange={(newSelectedProduct) => {
              onChange(
                selectedProducts.map((p) => {
                  if (p.id === newSelectedProduct.id) {
                    return newSelectedProduct;
                  }
                  return p;
                })
              );
            }}
          />
          <Tooltip content="Duplicate Product">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newList = [...selectedProducts];
                newList.splice(i + 1, 0, {
                  ...product,
                  id: generateUUID(),
                });
                onChange(newList);
              }}
            >
              <Copy />
            </Button>
          </Tooltip>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              onChange(selectedProducts.filter((p) => p.id !== product.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        className="w-min mt-2"
        onClick={() =>
          onChange(
            selectedProducts.concat({
              id: generateUUID(),
              dataset: "",
              mission: "",
              instrument: "",
              fields: [],
              version: "",
            })
          )
        }
      >
        + Add Product
      </Button>
    </div>
  );
};

export const Content = TabsPrimitive.Content;
