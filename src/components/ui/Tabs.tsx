import { Tabs, TabsList, TabsTrigger } from "@nasa-jpl/stellar-react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export declare type TabsRootProps = TabsPrimitive.TabsProps;

export const Root = (props: TabsRootProps) => (
  <Tabs
    {...props}
    className="bg-white border-b border-t flex flex-1 flex-col"
  />
);

export const List = (props: TabsPrimitive.TabsListProps) => (
  <TabsList
    {...props}
    className="flex flex-shrink-0 gap-0.5 w-min bg-transparent"
  />
);

export const Trigger = (props: TabsPrimitive.TabsTriggerProps) => (
  <TabsTrigger
    {...props}
    className="st-tabs-trigger font-medium text-xs rounded-none data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_-1px_0_0_currentcolor,_0_1px_0_0_currentcolor] hover:text-primary py-3"
  />
);

// Re-exporting a Radix component: the rule cannot statically tell a member
// expression is a component, so it reads as a non-component export.
// eslint-disable-next-line react-refresh/only-export-components
export const Content = TabsPrimitive.Content;
