import { Button } from "@nasa-jpl/react-stellar";
import classNames from "classnames";
import "./SidebarLink.css";

export declare type SidebarLinkProps = {
  title?: string;
  icon?: React.ReactNode;
  variant?: "primary-link" | "secondary-link";
};

export const SidebarLink = ({
  title = "",
  icon,
  variant = "secondary-link",
}: SidebarLinkProps) => {
  return (
    <Button
      variant="tertiary"
      className={classNames("sidebar-link", {
        "sidebar-link--primary": variant === "primary-link",
      })}
    >
      {/* TODO integrate react-router */}
      {icon}
      {title}
    </Button>
  );
};

export default SidebarLink;
