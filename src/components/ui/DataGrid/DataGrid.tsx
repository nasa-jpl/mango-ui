import {
  SizeColumnsToContentStrategy,
  SizeColumnsToFitGridStrategy,
  SizeColumnsToFitProvidedWidthStrategy,
} from "@ag-grid-community/core";
import { cn, Input } from "@nasa-jpl/stellar-react";
import { IRowNode } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import {
  AgGridReact,
  AgGridReactProps,
  CustomNoRowsOverlayProps,
} from "ag-grid-react";
import classNames from "classnames";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataGridColumnDef } from "../../../types/data-grid";
import "./ag-grid-stellar.css";
import { getFilterDisplayText } from "./data-grid-utils";

const CustomNoRowsOverlay = (
  props: CustomNoRowsOverlayProps & {
    error?: Error | null;
    hasUningestedLayers?: boolean;
  },
) => {
  const { error, hasUningestedLayers } = props;
  return (
    <div
      className={cn(
        "text-xs text-muted-foreground",
        error ? "text-destructive" : "",
        hasUningestedLayers ? "text-amber-700" : "",
      )}
    >
      {error?.message
        ? `Error: ${error?.message}`
        : hasUningestedLayers
          ? "No data ingested"
          : "No rows to display"}
    </div>
  );
};

export declare type DataGridProps<T> = {
  className?: string;
  columnDefs: DataGridColumnDef[];
  compact?: boolean;
  error?: Error | null;
  fitToGridWidth?: boolean;
  gridProps?: AgGridReactProps;
  hasUningestedLayers?: boolean;
  idKey?: keyof T | undefined;
  loading?: boolean;
  onClearFilters?: (clearFn: () => void) => void;
  onContentSizeChange?: (width: number) => void;
  onRowSelected?: (row: T | null) => void;
  rowData: T[];
  selectedItemId?: string | undefined;
  showQuickFilter?: boolean;
};

interface ActiveFilter {
  column: string;
  displayName: string;
  filterText: string;
}

export function DataGrid<T>({
  columnDefs,
  rowData,
  selectedItemId,
  onRowSelected = () => {},
  onClearFilters,
  onContentSizeChange,
  idKey,
  compact = false,
  fitToGridWidth = false,
  hasUningestedLayers = false,
  loading = true,
  showQuickFilter = false,
  className = "",
  gridProps = {},
  error,
}: DataGridProps<T>) {
  const gridRef = useRef<AgGridReact>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastReportedWidthRef = useRef<number | null>(null);
  const [gridReady, setGridReady] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  useEffect(() => {
    if (gridRef.current && gridRef.current.api && gridReady) {
      if (!selectedItemId || !idKey) {
        gridRef.current.api.deselectAll();
      } else {
        // Find the currently selected node
        gridRef.current.api.forEachNodeAfterFilterAndSort(
          (rowNode: IRowNode<T>) => {
            if (rowNode.data && gridRef.current?.api) {
              const value = gridRef.current.api.getCellValue({
                rowNode,
                colKey: idKey.toString(),
              });
              if (value === selectedItemId) {
                if (!rowNode.isSelected()) {
                  rowNode.setSelected(true);
                  if (rowNode.rowIndex !== null) {
                    gridRef.current.api.ensureIndexVisible(rowNode.rowIndex);
                  }
                }
              } else {
                if (rowNode.isSelected()) {
                  rowNode.setSelected(false);
                }
              }
            }
          },
        );
      }
    }
  }, [selectedItemId, idKey, gridReady]);

  const autoSizeStrategy = useMemo<
    | SizeColumnsToFitGridStrategy
    | SizeColumnsToFitProvidedWidthStrategy
    | SizeColumnsToContentStrategy
  >(() => {
    return {
      type: compact || !fitToGridWidth ? "fitCellContents" : "fitGridWidth",
    };
  }, [fitToGridWidth, compact]);

  const reportContentSize = () => {
    const api = gridRef.current?.api;
    if (!api || !onContentSizeChange) return;

    const cols = api.getAllDisplayedColumns();
    const totalColWidth = cols.reduce((sum, c) => sum + c.getActualWidth(), 0);

    if (lastReportedWidthRef.current === totalColWidth) return;
    lastReportedWidthRef.current = totalColWidth;
    onContentSizeChange(totalColWidth);
  };

  const fillRemainingWidth = () => {
    const api = gridRef.current?.api;
    const wrapper = wrapperRef.current;
    if (!api || !wrapper) return;

    const cols = api.getAllDisplayedColumns();
    if (cols.length === 0) return;

    // Measure ag-grid's body viewport (the actual scrollable column area) when
    // available — falls back to wrapper width.
    const viewport = wrapper.querySelector(
      ".ag-center-cols-viewport",
    ) as HTMLElement | null;
    const containerWidth = viewport?.clientWidth ?? wrapper.clientWidth;

    const totalColWidth = cols.reduce((sum, c) => sum + c.getActualWidth(), 0);
    const remaining = containerWidth - totalColWidth;
    if (remaining <= 1) return;

    const lastCol = cols[cols.length - 1];
    api.applyColumnState({
      state: [
        {
          colId: lastCol.getColId(),
          width: lastCol.getActualWidth() + remaining,
        },
      ],
    });
  };

  useEffect(() => {
    if (compact || !fitToGridWidth) {
      setTimeout(() => {
        gridRef.current?.api?.autoSizeColumns(
          gridRef.current?.api
            ?.getAllDisplayedColumns()
            .map((col) => col.getColId()),
        );
        reportContentSize();
        if (compact) {
          // Defer past parent re-render so the wrapper is at its final width
          // before we extend the last column.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => fillRemainingWidth()),
          );
        }
      }, 15);
    } else {
      gridRef.current?.api?.sizeColumnsToFit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToGridWidth, compact, rowData]);

  useEffect(() => {
    if (!compact || !wrapperRef.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      // Defer to next frame so ag-grid's own viewport has reflowed before we measure.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => fillRemainingWidth());
    });
    observer.observe(wrapperRef.current);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [compact, rowData]);

  const noRowsOverlayComponentParams = useMemo(() => {
    return {
      error,
      hasUningestedLayers,
    };
  }, [error, hasUningestedLayers]);

  const onFilterTextBoxChanged = (event: React.FormEvent<HTMLInputElement>) => {
    if (gridRef.current?.api) {
      gridRef.current.api.setGridOption(
        "quickFilterText",
        event.currentTarget.value,
      );
    }
  };

  const updateActiveFilters = () => {
    if (!gridRef.current?.api) return;

    const filterModel = gridRef.current.api.getFilterModel();
    const filters: ActiveFilter[] = [];

    Object.keys(filterModel).forEach((colId) => {
      const column = gridRef.current?.api?.getColumn(colId);
      const displayName = column?.getColDef().headerName || colId;
      const filterText = getFilterDisplayText(filterModel[colId]);

      if (filterText) {
        filters.push({
          column: colId,
          displayName,
          filterText,
        });
      }
    });

    setActiveFilters(filters);
  };

  const removeFilter = (columnId: string) => {
    if (!gridRef.current?.api) return;

    const filterModel = gridRef.current.api.getFilterModel();
    delete filterModel[columnId];
    gridRef.current.api.setFilterModel(filterModel);
  };

  const clearFilters = () => {
    if (gridRef.current?.api) {
      // Clear column filters
      gridRef.current.api.setFilterModel(null);
      // Clear quick filter
      gridRef.current.api.setGridOption("quickFilterText", "");
      // Clear the input field if it exists
      const filterInput = document.getElementById(
        "filter-text-box",
      ) as HTMLInputElement;
      if (filterInput) {
        filterInput.value = "";
      }
    }
  };

  useEffect(() => {
    if (onClearFilters && gridReady) {
      onClearFilters(clearFilters);
    }
  }, [gridReady, onClearFilters]);

  return (
    <div
      ref={wrapperRef}
      className={classNames("ag-theme-stellar", {
        "ag-theme-stellar--compact": compact,
      })}
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showQuickFilter && (
        <div className="mb-4 w-[25%] min-w-[300px]">
          <Input
            autoComplete="off"
            type="text"
            id="filter-text-box"
            sizeVariant="sm"
            placeholder="Filter..."
            onInput={onFilterTextBoxChanged}
          />
        </div>
      )}
      {activeFilters.length > 0 && (
        <div className="my-1 ml-2 flex flex-wrap items-center gap-2">
          <div>Active Filters:</div>
          {activeFilters.map((filter) => (
            <div
              key={filter.column}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground",
              )}
            >
              <span className="font-semibold">{filter.displayName}:</span>
              <span>{filter.filterText}</span>
              <button
                onClick={() => removeFilter(filter.column)}
                className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
                aria-label={`Remove ${filter.displayName} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <AgGridReact<T>
        ref={gridRef}
        suppressColumnVirtualisation
        headerHeight={32}
        rowHeight={compact ? 24 : 33}
        className={className}
        rowData={error ? [] : rowData}
        rowSelection={{
          checkboxes: false,
          enableClickSelection: true,
          mode: "singleRow",
        }}
        loading={loading}
        columnDefs={columnDefs}
        quickFilterText={gridProps.quickFilterText}
        enableBrowserTooltips={true}
        animateRows={false}
        suppressCellFocus
        autoSizeStrategy={autoSizeStrategy}
        onGridReady={() => setGridReady(true)}
        onFilterChanged={updateActiveFilters}
        enableCellTextSelection
        suppressDragLeaveHidesColumns
        noRowsOverlayComponent={CustomNoRowsOverlay}
        noRowsOverlayComponentParams={noRowsOverlayComponentParams}
        /* TODO style this and don't load it from url */
        overlayLoadingTemplate='<div aria-live="polite" aria-atomic="true" style="position:absolute;top:0;left:0;right:0; bottom:0; background: url(https://ag-grid.com/images/ag-grid-loading-spinner.svg) center no-repeat" aria-label="loading"></div>'
        onSelectionChanged={() => {
          const selectedNodes = gridRef.current?.api?.getSelectedNodes() ?? [];
          onRowSelected(selectedNodes[0]?.data ?? null);
        }}
        {...gridProps}
      />
    </div>
  );
}

export default DataGrid;
