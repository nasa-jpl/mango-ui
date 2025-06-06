export declare type SidebarContainerProps = {
  children?: React.ReactNode;
  logo?: React.ReactNode;
  title?: string;
};

export const SidebarContainer = ({
  title = "",
  logo,
  children,
}: SidebarContainerProps) => {
  return (
    /* TODO merge with Sidebar.tsx */
    <div className="border-r flex flex-col flex-shrink-0 gap-4 h-full w-[208px]">
      <div className="items-center flex gap-2 px-2 pt-4 pb-0">
        {logo && <div className="[&>svg]:h-8 [&>svg]:w-8">{logo}</div>}
        <div className="text-lg cursor-default select-none font-medium">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
};

export default SidebarContainer;
