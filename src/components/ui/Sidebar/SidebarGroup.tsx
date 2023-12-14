import { Button, IconCaretDown, IconCaretRight } from "@nasa-jpl/react-stellar";
import { useState } from "react";
import "./SidebarGroup.css";

export declare type SidebarGroupProps = {
  title?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
};

export const SidebarGroup = ({
  title = "",
  defaultOpen = true,
  children,
}: SidebarGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-group">
      <Button variant="tertiary" onClick={() => setOpen(!open)}>
        {open ? <IconCaretDown /> : <IconCaretRight />}
        {title}
      </Button>
      {open && <div className="sidebar-group-content">{children}</div>}
    </div>
  );
};

export default SidebarGroup;
