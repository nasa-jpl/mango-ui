// import {
//   Avatar,
//   Button,
//   IconArrowRight,
//   IconChevronDown,
//   Menu,
//   MenuItem,
//   MenuLabel,
//   MenuRightSlot,
//   NavbarBrand,
//   NavbarBreakpoint,
//   NavbarContent,
//   NavbarLink,
//   NavbarMobileMenu,
//   Navbar as StellarNavbar,
// } from "@nasa-jpl/react-stellar";
import "./SidebarContainer.css";

export declare type SidebarContainerProps = {
  title?: string;
  children?: React.ReactNode;
};

export const SidebarContainer = ({
  title = "",
  logo,
  children,
}: SidebarContainerProps) => {
  return (
    <div className="sidebar">
      <div>
        {logo && <div>{logo}</div>}
        <div className="st-typography-medium sidebar-title">{title}</div>
      </div>
      {children}
      {/* <div>
        <div>Home</div>
        <div>Datasets</div>
        <div>Sandbox</div>
      </div>
      <div className="sidebar-group">
        <div>Downlink & Product Generation</div>
        <div>
          <div>Pass Reports</div>
          <div>Product Generation</div>
        </div>
      </div> */}
    </div>
  );
};

export default SidebarContainer;
