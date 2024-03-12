import { Button, IconCaretDown, IconCaretRight } from "@nasa-jpl/react-stellar";
import { useState } from "react";
import "./SidebarGroup.css";

export declare type SidebarGroupProps = {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  title?: string;
};

export const SidebarGroup = ({
  title = "",
  defaultOpen = true,
  children,
}: SidebarGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-group">
      <Button
        className="sidebar-group-button st-typography-bold"
        variant="tertiary"
        onClick={() => setOpen(!open)}
      >
        {open ? <IconCaretDown /> : <IconCaretRight />}
        {title}
      </Button>
      {open && <div className="sidebar-group-content">{children}</div>}
    </div>
  );
};

export default SidebarGroup;
