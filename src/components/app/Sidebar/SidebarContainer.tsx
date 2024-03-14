import "./SidebarContainer.css";

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
    <div className="sidebar">
      <div className="sidebar-branding">
        {logo && <div className="sidebar-logo">{logo}</div>}
        <div className="st-typography-medium sidebar-title">{title}</div>
      </div>
      {children}
    </div>
  );
};

export default SidebarContainer;
