import { Button } from "@nasa-jpl/react-stellar";
import { ChartLine } from "@phosphor-icons/react";
import { CustomFloatingFilterProps } from "ag-grid-react";
import "./CustomFilter.css";

export interface CustomProps extends CustomFloatingFilterProps {
  onColumnPreview?: () => void;
}

export function CustomFilter({ onColumnPreview }: CustomProps) {
  return (
    onColumnPreview && (
      <Button
        className="ag-header-cell-menu-button ag-header-menu-always-show"
        variant="icon"
        onClick={() => {
          if (onColumnPreview) {
            onColumnPreview();
          }
        }}
      >
        <ChartLine width={16} height={16} />
      </Button>
    )
  );
}
