import {
  TooltipContent,
  Tooltip as TooltipRoot,
  TooltipTrigger,
} from "@nasa-jpl/stellar-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export type TooltipProps = {
  content?: React.ReactNode;
  contentProps?: TooltipPrimitive.TooltipContentProps;
} & TooltipPrimitive.TooltipProps;

export function Tooltip({
  children,
  content,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: TooltipProps) {
  return (
    <TooltipRoot
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent {...props}>{content}</TooltipContent>
    </TooltipRoot>
  );
}
