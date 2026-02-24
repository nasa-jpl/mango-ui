import { Button } from "@nasa-jpl/stellar-react";
import { Copy, Filter, LucideFilterX, Trash2 } from "lucide-react";
import { memo } from "react";
import { Product, ProductField } from "../../types/api";
import { DateRange } from "../../types/time";
import { generateUUID } from "../../utilities/generic";
import { SelectedProduct } from "./EntityEditor";
import { ProductSelector } from "./ProductSelector";
import { Tooltip } from "./Tooltip";

export declare type ProductsSelectorProps = {
  dateRange?: DateRange;
  fieldFilter: (field: ProductField) => boolean;
  multiple: boolean;
  onChange: (selectedProducts: SelectedProduct[]) => void;
  products: Product[];
  selectedProducts: SelectedProduct[];
};

const ProductsSelector = ({
  dateRange,
  onChange,
  products,
  selectedProducts,
  fieldFilter,
  multiple = false,
}: ProductsSelectorProps) => {
  return (
    <div className="flex flex-col gap-4">
      {selectedProducts.map((product, i) => (
        <div className="flex flex-col gap-1" key={product.id}>
          <div className="flex gap-2 items-end">
            <ProductSelector
              dateRange={dateRange}
              multiple={multiple}
              fieldFilter={fieldFilter}
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
            <Tooltip
              content={
                typeof product.filter === "string"
                  ? "Remove Filter"
                  : "Add Filter"
              }
            >
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newProducts = selectedProducts.map((p) => {
                    if (p.id === product.id) {
                      if (typeof product.filter === "string") {
                        const newProduct = structuredClone(p);
                        delete newProduct.filter;
                        return newProduct;
                      } else {
                        return { ...p, filter: "" };
                      }
                    }
                    return p;
                  });
                  onChange(newProducts);
                }}
              >
                {typeof product.filter === "string" ? (
                  <LucideFilterX />
                ) : (
                  <Filter />
                )}
              </Button>
            </Tooltip>
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
          {((product as unknown as { subsetVersionCount?: number }).subsetVersionCount ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground">
              {(product as unknown as { subsetVersionCount: number }).subsetVersionCount} subset version{((product as unknown as { subsetVersionCount: number }).subsetVersionCount) === 1 ? "" : "s"}
            </div>
          )}
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

export default memo(ProductsSelector);
