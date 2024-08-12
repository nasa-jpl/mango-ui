import { Button, IconFilter } from "@nasa-jpl/react-stellar";
import { ArrowDown, ArrowUp, ChartLine } from "@phosphor-icons/react";
import { CustomHeaderProps } from "ag-grid-react";
import { useEffect, useRef, useState } from "react";
import "./CustomHeader.css";

export interface MyCustomHeaderProps extends CustomHeaderProps {
  onColumnPreview?: () => void;
}

export const CustomHeader = (props: MyCustomHeaderProps) => {
  const [sort, setSort] = useState<"asc" | "desc" | undefined | null>(
    undefined
  );
  const refButton = useRef(null);

  const onMenuClicked = () => {
    props.showColumnMenu(refButton.current!);
  };

  const onSortChanged = () => {
    const sort = props.column.getSort();
    setSort(sort);
  };

  const onSortRequested = (
    order: "asc" | "desc" | undefined,
    event:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>
  ) => {
    const newSort = order === undefined ? null : order;
    props.setSort(newSort, event.shiftKey);
  };

  useEffect(() => {
    props.column.addEventListener("sortChanged", onSortChanged);
    onSortChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCellClick = (
    event:
      | React.MouseEvent<HTMLDivElement, MouseEvent>
      | React.TouchEvent<HTMLDivElement>
  ) => {
    const sort = props.column.getSort();
    if (!sort) {
      onSortRequested("desc", event);
    } else if (sort === "desc") {
      onSortRequested("asc", event);
    } else if (sort === "asc") {
      onSortRequested(undefined, event);
    }
  };

  return (
    <div className="ag-header-cell-comp-wrapper">
      <div className="ag-cell-label-container">
        <Button
          variant="icon"
          ref={refButton}
          className="ag-header-cell-menu-button ag-header-cell-menu-button--filter"
          onClick={() => onMenuClicked()}
        >
          <IconFilter />
        </Button>
        {props.onColumnPreview && (
          <Button
            className="ag-header-cell-menu-button"
            variant="icon"
            onClick={() => {
              if (props.onColumnPreview) {
                props.onColumnPreview();
              }
            }}
          >
            <ChartLine width={16} height={16} />
          </Button>
        )}

        <div
          className="ag-header-cell-label"
          onClick={onCellClick}
          onTouchEnd={onCellClick}
        >
          <span className="ag-header-cell-text">{props.displayName}</span>
          {sort === "asc" && <ArrowUp width={16} height={16} />}
          {sort === "desc" && <ArrowDown width={16} height={16} />}
        </div>
      </div>
    </div>
  );
};

export default CustomHeader;
