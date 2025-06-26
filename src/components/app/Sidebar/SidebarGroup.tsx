import { Button } from "@nasa-jpl/stellar-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

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
    <div className="w-full">
      <Button
        className="justify-start pl-2 text-[10px] text-gray-600 gap-1 w-full font-bold"
        variant="ghost"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </Button>
      {open && children}
    </div>
  );
};

export default SidebarGroup;
