import { Button } from "@nasa-jpl/react-stellar";
import "./SidebarLink.css";

export declare type SidebarLinkProps = {
  title?: string;
  icon?: React.ReactNode;
};

export const SidebarLink = ({ title = "", icon }: SidebarLinkProps) => {
  return (
    <div className="sidebar-link">
      {/* TODO integrate react-router */}
      <Button variant="tertiary">
        {icon && <div>{icon}</div>}
        {title}
      </Button>
    </div>
  );
};

export default SidebarLink;
