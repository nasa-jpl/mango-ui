import {
  IconBeaker,
  IconDatabase,
  IconExternalLink,
  IconHelp,
  IconHome,
  IconSatellite,
  IconSettings,
} from "@nasa-jpl/react-stellar";
import { NavLink } from "react-router-dom";
import { View } from "../../../types/view";
import "./Sidebar.css";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  view?: View;
  title?: string;
};

const getNavLinkClass = ({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) => {
  return isActive
    ? "sidebar-link--active"
    : isPending
    ? "sidebar-link--pending"
    : "";
};

export const Sidebar = ({ title = "", logo, view }: SidebarProps) => {
  return (
    <SidebarContainer title={title} logo={<IconSatellite />}>
      <div className="sidebar-padded-content">
        <NavLink className={getNavLinkClass} to="/">
          <SidebarLink
            title="Home"
            icon={<IconHome />}
            variant="primary-link"
          />
        </NavLink>
        <NavLink className={getNavLinkClass} to="/datasets">
          <SidebarLink
            title="Datasets"
            icon={<IconDatabase />}
            variant="primary-link"
          />
        </NavLink>
        <NavLink className={getNavLinkClass} to="/sandbox">
          <SidebarLink
            title="Sandbox"
            icon={<IconBeaker />}
            variant="primary-link"
          />
        </NavLink>
      </div>
      {!view ? (
        <div>Loading</div>
      ) : (
        view.pageGroups.map((pageGroup) => {
          return (
            <div key={pageGroup.id} className="sidebar-padded-content">
              <SidebarGroup title={pageGroup.title}>
                {pageGroup.pages.map((page) => (
                  <NavLink
                    className={getNavLinkClass}
                    to={`view/${pageGroup.url}/${page.url}`}
                    key={page.id}
                  >
                    <SidebarLink title={page.title} />
                  </NavLink>
                ))}
              </SidebarGroup>
            </div>
          );
        })
      )}
      <div className="sidebar-bottom-content">
        <div className="sidebar-divider" />
        <div className="sidebar-padded-content">
          <SidebarLink title="Settings" icon={<IconSettings />} />
          <SidebarLink title="Help" icon={<IconHelp />} />
          <SidebarLink title="Sign Out" icon={<IconExternalLink />} />
        </div>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;
