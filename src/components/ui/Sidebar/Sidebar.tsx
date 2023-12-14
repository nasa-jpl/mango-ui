import {
  IconBeaker,
  IconDatabase,
  IconExternalLink,
  IconHelp,
  IconHome,
  IconSettings,
} from "@nasa-jpl/react-stellar";
import { View } from "../../../types/view";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  view?: View;
  title?: string;
  logo?: React.ReactNode;
};

export const Sidebar = ({ title = "", logo, view }: SidebarProps) => {
  return (
    <SidebarContainer title={title}>
      <div>
        <SidebarLink title="Home" icon={<IconHome />} />
        <SidebarLink title="Datasets" icon={<IconDatabase />} />
        <SidebarLink title="Sandbox" icon={<IconBeaker />} />
      </div>
      {!view ? (
        <div>Loading</div>
      ) : (
        view?.pageGroups.map((pageGroup) => {
          return (
            <SidebarGroup key={pageGroup.id} title={pageGroup.title}>
              {pageGroup.pages.map((page) => (
                <SidebarLink title={page.title} key={page.id} />
              ))}
            </SidebarGroup>
          );
        })
      )}
      <div>
        <SidebarLink title="Settings" icon={<IconSettings />} />
        <SidebarLink title="Help" icon={<IconHelp />} />
        <SidebarLink title="Sign Out" icon={<IconExternalLink />} />
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;
