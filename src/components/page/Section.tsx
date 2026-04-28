import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nasa-jpl/stellar-react";
import classNames from "classnames";
import {
  ChevronDown,
  ChevronRight,
  CopyPlus,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import ReactGridLayout, { Layout, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { DataResponseDataEntry, Product } from "../../types/api";
import { ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import { Entity as EntityType, Section as SectionType } from "../../types/view";
import { usePrompt } from "../ui/AlertDialogProvider";
import { Tooltip } from "../ui/Tooltip";
import CustomGridItemComponent from "./CustomGridItem";
import Entity from "./Entity";
import "./Section.css";

export declare type SectionProps = {
  dateBounds: DateRange;
  dateRange: DateRange;
  hoverDate: Date | null;
  instrument?: string | null;
  mission?: string | null;
  onAddEntity: () => void;
  onDateRangeChange: (dateRange: DateRange) => void;
  onEntityDelete: (entity: EntityType, section: SectionType) => void;
  onEntityDuplicate: (entity: EntityType, section: SectionType) => void;
  onEntityEdit: (entity: EntityType, section: SectionType) => void;
  onHoverDateChange: (date: Date | null) => void;
  onSectionChange: (section: SectionType) => void;
  onSectionDelete: (section: SectionType) => void;
  onSectionDuplicate: (section: SectionType) => void;
  onSelectPoint: (point: DataResponseDataEntry | null) => void;
  onSetProductPreview: (productPreview: ProductPreview) => void;
  products: Product[];
  section: SectionType;
  selectedPoint: DataResponseDataEntry | null;
};

const REACT_GRID_LAYOUT_COL_NUM = 16;
const REACT_GRID_LAYOUT_ROW_HEIGHT = 44; // px
const REACT_GRID_LAYOUT_MARGIN = 8; // px

export const Section = ({
  dateRange,
  dateBounds,
  hoverDate,
  products,
  section,
  selectedPoint,
  instrument = null,
  mission = null,
  onSectionChange = () => {},
  onSectionDuplicate = () => {},
  onSectionDelete = () => {},
  onAddEntity = () => {},
  onDateRangeChange = () => {},
  onEntityDelete = () => {},
  onEntityDuplicate = () => {},
  onEntityEdit = () => {},
  onSelectPoint = () => {},
  onHoverDateChange = () => {},
  onSetProductPreview = () => {},
}: SectionProps) => {
  const { defaultOpen, enableHeader, entities, layout, title } = section;
  const [open, setOpen] = useState(defaultOpen || !enableHeader);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [compactSizes, setCompactSizes] = useState<
    Record<string, { w: number }>
  >({});
  const MemoizedReactGridLayout = useMemo(
    () => WidthProvider(ReactGridLayout),
    [],
  );
  const resizable =
    typeof section.resizable === "boolean" ? section.resizable : true;
  const adjustedLayout = useMemo(
    () =>
      layout.map((item) =>
        item.i in compactSizes ? { ...item, w: compactSizes[item.i].w } : item,
      ),
    [layout, compactSizes],
  );
  const onLayoutChange = (layouts: Layout[]) => {
    const newSection = { ...section };
    newSection.layout = layouts.map((layout) => {
      const { i, x, y, w, h } = layout;
      return { i, x, y, w, h };
    });
    onSectionChange(newSection);
  };
  const onDragStart = () => setDragging(true);
  const onDragStop = () => setDragging(false);
  const onResizeStart = () => setResizing(true);
  const onResizeStop = () => setResizing(false);
  const entityClass = classNames({
    "select-none": dragging || resizing,
  });
  const prompt = usePrompt();

  let wrapperRef: HTMLDivElement | null = null;

  const enableMoveAnimations = (enable: boolean) => {
    const className = "react-grid-layout--enable-move-animations";
    if (wrapperRef) {
      if (enable) {
        wrapperRef.classList.add(className);
      } else {
        wrapperRef.classList.remove(className);
      }
    }
  };

  /**
   * Library bug as of 2/14/24: https://github.com/react-grid-layout/react-grid-layout/issues/1940
   * Workaround: https://github.com/grafana/grafana/blob/c490b702bfe2bd5eaed84b41ad961455c02ee57f/public/app/features/dashboard/dashgrid/DashboardGrid.tsx#L284
   * Without this hack the move animations are triggered on initial load and all items fly into position.
   * This can be quite distracting and make the dashboard appear to less snappy.
   */
  const onGetWrapperDivRef = (ref: HTMLDivElement | null) => {
    if (ref) {
      wrapperRef = ref;
      setTimeout(() => {
        enableMoveAnimations(true);
      }, 500);
    }
  };

  const onRenameSection = async () => {
    const title = await prompt({
      defaultValue: section.title,
      inputProps: {
        placeholder: "Enter a new name for this section",
        autoComplete: "off",
      },
      title: "Rename Section",
    });
    if (typeof title === "string") {
      onSectionChange({ ...section, title });
    }
  };

  const onCompactResize = (entityId: string, totalWidth: number) => {
    if (!wrapperRef) return;
    const containerWidth = wrapperRef.clientWidth;
    const margin = REACT_GRID_LAYOUT_MARGIN;
    const cols = REACT_GRID_LAYOUT_COL_NUM;
    const colWidth = (containerWidth - margin * (cols - 1)) / cols;
    const fitted = Math.max(
      1,
      Math.round((totalWidth + margin) / (colWidth + margin)),
    );
    // Pad by one grid column so the rightmost data column isn't clipped by borders/scrollbar.
    const w = Math.min(fitted + 1, cols);
    setCompactSizes((prev) => ({ ...prev, [entityId]: { w } }));
  };

  const renderEntity = (e: EntityType) => (
    <Entity
      products={products}
      entity={e}
      onDateRangeChange={onDateRangeChange}
      dateBounds={dateBounds}
      onDelete={() => onEntityDelete(e, section)}
      onDuplicate={() => onEntityDuplicate(e, section)}
      onEdit={() => onEntityEdit(e, section)}
      onHoverDateChange={onHoverDateChange}
      onSelectPoint={onSelectPoint}
      onSetProductPreview={onSetProductPreview}
      key={e.id}
      className={entityClass}
      dateRange={dateRange}
      hoverDate={hoverDate}
      selectedPoint={selectedPoint}
      mission={mission}
      instrument={instrument}
      onCompactResize={(width: number) => onCompactResize(e.id, width)}
    />
  );

  return (
    <div
      className={classNames({
        "section--open": open,
        "section--full-height": !!section.fullHeight,
      })}
    >
      {enableHeader && (
        <div
          className={classNames(
            "border-t sticky top-0 w-full bg-background z-[1] shadow-[0_1px_0_0_hsl(var(--border))]",
            { "": open },
          )}
        >
          <Button
            className="w-full rounded-none gap-1 h-10 justify-start px-2 py-3 hover:bg-gray-50"
            variant="ghost"
            onClick={() => {
              enableMoveAnimations(false);
              setOpen(!open);
            }}
          >
            {open ? <ChevronDown /> : <ChevronRight />}
            {title}
          </Button>
          <div className="absolute right-4 top-2 flex justify-center gap-2">
            <Tooltip content="Add Entity">
              <Button variant="ghost" size="icon" onClick={onAddEntity}>
                <Plus />
              </Button>
            </Tooltip>
            <DropdownMenu>
              <Tooltip content="More options">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical size={16} className="select-none" />
                  </Button>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={onRenameSection}>
                  <Pencil /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSectionDuplicate(section)}>
                  <CopyPlus /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSectionDelete(section)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      <div className="section-content" ref={onGetWrapperDivRef}>
        {entities.length === 0 && (
          <div className="text-muted-foreground">No entities added</div>
        )}
        {!resizable && entities.map(renderEntity)}
        {resizable && (
          <MemoizedReactGridLayout
            measureBeforeMount={false} // TODO not working right yet with true, existing bug with the library
            draggableHandle=".entity-drag-handle"
            margin={[REACT_GRID_LAYOUT_MARGIN, REACT_GRID_LAYOUT_MARGIN]}
            containerPadding={[0, 0]}
            rowHeight={REACT_GRID_LAYOUT_ROW_HEIGHT}
            cols={REACT_GRID_LAYOUT_COL_NUM}
            className="layout"
            layout={adjustedLayout}
            onLayoutChange={onLayoutChange}
            onDragStart={onDragStart}
            onDragStop={onDragStop}
            onResizeStart={onResizeStart}
            onResizeStop={onResizeStop}
          >
            {entities.map((e) => {
              return (
                // @ts-expect-error No typing available
                <CustomGridItemComponent key={e.id}>
                  {renderEntity(e)}
                </CustomGridItemComponent>
              );
            })}
          </MemoizedReactGridLayout>
        )}
      </div>
    </div>
  );
};

export default Section;
