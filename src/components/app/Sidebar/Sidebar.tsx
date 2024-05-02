import {
  IconExternalLink,
  IconHelp,
  IconSettings,
} from "@nasa-jpl/react-stellar";
import { Database, Flask, HouseLine, Planet } from "@phosphor-icons/react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { View } from "../../../types/view";
import "./Sidebar.css";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  title?: string;
  view?: View;
};

export const Sidebar = ({ title = "", view }: SidebarProps) => {
  const [active, setActive] = useState("home");

  const getNavLinkClass = (isActive: boolean, path: string) => {
    if (isActive) {
      // Run the set state outside of this frame to avoid React warning
      setTimeout(() => {
        setActive(path);
      }, 0);
    }
    return isActive ? "sidebar-link--active" : "";
  };

  return (
    <SidebarContainer title={title} logo={<Planet weight="duotone" />}>
      <div className="sidebar-padded-content">
        <NavLink
          className={(activeNav) => getNavLinkClass(activeNav.isActive, "/")}
          to=""
        >
          <SidebarLink
            title="Home"
            icon={
              <HouseLine weight={active === "/" ? "fill" : "bold"} size={16} />
            }
            variant="primary-link"
          />
        </NavLink>
        <NavLink
          className={(activeNav) =>
            getNavLinkClass(activeNav.isActive, "/datasets")
          }
          to="datasets"
        >
          <SidebarLink
            title="Datasets"
            icon={
              <Database
                weight={active === "/datasets" ? "fill" : "bold"}
                size={16}
              />
            }
            variant="primary-link"
          />
        </NavLink>
        <NavLink
          className={(activeNav) =>
            getNavLinkClass(activeNav.isActive, "/sandbox")
          }
          to="sandbox"
        >
          <SidebarLink
            title="Sandbox"
            icon={
              <Flask
                size={16}
                weight={active === "/sandbox" ? "fill" : "bold"}
              />
            }
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
                    className={(activeNav) =>
                      getNavLinkClass(
                        activeNav.isActive,
                        `view/${pageGroup.url}/${page.url}`
                      )
                    }
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
