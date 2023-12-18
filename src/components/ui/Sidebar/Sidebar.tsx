import {
  IconBeaker,
  IconDatabase,
  IconExternalLink,
  IconHelp,
  IconHome,
  IconSatellite,
  IconSettings,
} from "@nasa-jpl/react-stellar";
import { View } from "../../../types/view";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  view?: View;
  title?: string;
};

export const Sidebar = ({ title = "", logo, view }: SidebarProps) => {
  return (
    <SidebarContainer title={title} logo={<IconSatellite />}>
      <div className="sidebar-padded-content">
        <SidebarLink title="Home" icon={<IconHome />} variant="primary-link" />
        <SidebarLink
          title="Datasets"
          icon={<IconDatabase />}
          variant="primary-link"
        />
        <SidebarLink
          title="Sandbox"
          icon={<IconBeaker />}
          variant="primary-link"
        />
      </div>
      {!view ? (
        <div>Loading</div>
      ) : (
        view.pageGroups.map((pageGroup) => {
          return (
            <div className="sidebar-padded-content">
              <SidebarGroup key={pageGroup.id} title={pageGroup.title}>
                {pageGroup.pages.map((page) => (
                  <SidebarLink title={page.title} key={page.id} />
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
