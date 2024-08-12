import classNames from "classnames";
import { useMemo, useState } from "react";
import ReactGridLayout, { Layout, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import {
  Button,
  IconCaretDown,
  IconCaretRight,
} from "@nasa-jpl/react-stellar/";
import { Product } from "../../types/api";
import { ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import { Section as SectionType } from "../../types/view";
import CustomGridItemComponent from "./CustomGridItem";
import Entity from "./Entity";
import "./Section.css";

export declare type SectionProps = {
  dateRange: DateRange;
  hoverDate: Date | null;
  onDateRangeChange: (dateRange: DateRange) => void;
  onHoverDateChange: (date: Date | null) => void;
  onSectionChange: (section: SectionType) => void;
  onSetProductPreview: (productPreview: ProductPreview) => void;
  products: Product[];
  section: SectionType;
};

export const Section = ({
  dateRange,
  hoverDate,
  products,
  section,
  onSectionChange,
  onDateRangeChange = () => {},
  onHoverDateChange = () => {},
  onSetProductPreview = () => {},
}: SectionProps) => {
  const { defaultOpen, enableHeader, entities, layout, title } = section;
  const [open, setOpen] = useState(defaultOpen || !enableHeader);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const MemoizedReactGridLayout = useMemo(
    () => WidthProvider(ReactGridLayout),
    []
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
    "entity-prevent-highlight": dragging || resizing,
  });

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

  return (
    <div className={classNames("section", { "section--open": open })}>
      <div className="section-header">
        {enableHeader && (
          <Button
            variant="tertiary"
            onClick={() => {
              enableMoveAnimations(false);
              setOpen(!open);
            }}
          >
            {open ? <IconCaretDown /> : <IconCaretRight />}
            {title}
          </Button>
        )}
      </div>
      <div className="section-content" ref={onGetWrapperDivRef}>
        <MemoizedReactGridLayout
          measureBeforeMount={false} // TODO not working right yet with true, existing bug with the library
          draggableHandle=".entity-drag-handle"
          compactType="horizontal"
          margin={[8, 8]}
          containerPadding={[0, 0]}
          rowHeight={176}
          className="layout"
          layout={layout}
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
                <Entity
                  products={products}
                  entity={e}
                  onDateRangeChange={onDateRangeChange}
                  onHoverDateChange={onHoverDateChange}
                  onSetProductPreview={onSetProductPreview}
                  key={e.id}
                  className={entityClass}
                  dateRange={dateRange}
                  hoverDate={hoverDate}
                />
              </CustomGridItemComponent>
            );
          })}
        </MemoizedReactGridLayout>
      </div>
    </div>
  );
};

export default Section;
