import * as TabsPrimitive from "@radix-ui/react-tabs";
import "./Tabs.css";

export declare type TabsRootProps = TabsPrimitive.TabsProps;

export const Root = (props: TabsRootProps) => (
  <TabsPrimitive.Root {...props} className="st-tabs" />
);

export const List = (props: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List {...props} className="st-tabs-list" />
);

export const Trigger = (props: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    {...props}
    className="st-tabs-trigger st-button tertiary st-typography-medium"
  />
);

export const Content = TabsPrimitive.Content;
