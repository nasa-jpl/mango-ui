import {
  CSSProperties,
  MouseEventHandler,
  TouchEventHandler,
  forwardRef,
} from "react";

export type CustomGridItemComponentProps = {
  children: React.ReactNode;
  className: string;
  onMouseDown: MouseEventHandler;
  onMouseUp: MouseEventHandler;
  onTouchEnd: TouchEventHandler;
  style: CSSProperties;
};

export const CustomGridItemComponent = forwardRef<
  HTMLDivElement,
  CustomGridItemComponentProps
>(({ style, className, onMouseDown, onMouseUp, onTouchEnd, children }, ref) => {
  return (
    <div
      style={{ ...style }}
      className={className}
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  );
});

export default CustomGridItemComponent;
