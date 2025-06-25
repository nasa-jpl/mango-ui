import { Button } from "@nasa-jpl/stellar-react";
import { CustomFloatingFilterProps } from "ag-grid-react";
import { ChartLine } from "lucide-react";
import "./CustomFilter.css";

export interface CustomProps extends CustomFloatingFilterProps {
  onColumnPreview?: () => void;
}

export function CustomFilter({ onColumnPreview }: CustomProps) {
  return (
    onColumnPreview && (
      <Button
        className="ag-header-cell-menu-button ag-header-menu-always-show"
        variant="ghost"
        size="icon"
        onClick={() => {
          if (onColumnPreview) {
            onColumnPreview();
          }
        }}
      >
        <ChartLine size={16} />
      </Button>
    )
  );
}
