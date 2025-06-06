import { Button } from "@nasa-jpl/stellar-react";
import classNames from "classnames";

export declare type SidebarLinkProps = {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  variant?: "primary-link" | "secondary-link";
};

export const SidebarLink = ({
  className = "",
  title = "",
  icon,
  variant = "secondary-link",
}: SidebarLinkProps) => {
  return (
    <Button
      tabIndex={-1}
      size="lg"
      variant="ghost"
      className={classNames(
        "items-center rounded justify-start overflow-hidden px-2 py-[6px] whitespace-nowrap w-full text-xs text-secondary-foreground/70",
        {
          "font-semibold": variant === "primary-link",
        },
        className
      )}
    >
      {icon}
      <div className="block overflow-hidden text-ellipsis">{title}</div>
    </Button>
  );
};

export default SidebarLink;
