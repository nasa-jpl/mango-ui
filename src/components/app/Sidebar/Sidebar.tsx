import { Button, IconHelp } from "@nasa-jpl/react-stellar";
import {
  Checks,
  Database,
  FloppyDisk,
  Gear,
  HouseLine,
  Planet,
} from "@phosphor-icons/react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { config } from "../../../config";
import { View } from "../../../types/view";
import SaveViewModal from "../SaveViewModal";
import "./Sidebar.css";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  onViewSaved: (view: View) => void;
  title?: string;
  view?: View;
  viewSavingEnabled?: boolean;
};

export const Sidebar = ({
  onViewSaved = () => {},
  title = "",
  view,
  viewSavingEnabled,
}: SidebarProps) => {
  const [active, setActive] = useState("home");
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);

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
          to="/"
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
            getNavLinkClass(activeNav.isActive, "/products")
          }
          to="products"
        >
          <SidebarLink
            title="Products"
            icon={
              <Database
                weight={active === "/products" ? "fill" : "bold"}
                size={16}
              />
            }
            variant="primary-link"
          />
        </NavLink>
        {/* <NavLink
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
        </NavLink> */}
      </div>
      {!view ? (
        <div className="sidebar-padded-content st-typography-label">
          Loading
        </div>
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
          {view && (
            <SaveViewModal
              open={showSaveViewModal}
              view={view}
              onClose={() => setShowSaveViewModal(false)}
              onSave={onViewSaved}
            />
          )}
          {viewSavingEnabled && (
            <Button
              icon={<FloppyDisk size={16} />}
              variant="secondary"
              className="sidebar-save-view-changes"
              onClick={() => setShowSaveViewModal(true)}
            >
              Save View Changes
            </Button>
          )}
          {!viewSavingEnabled && (
            <Button
              icon={<Checks size={16} />}
              variant="tertiary"
              className="sidebar-save-view-changes sidebar-no-view-changes"
              disabled
            >
              View up-to-date
            </Button>
          )}
          <NavLink
            className={(activeNav) =>
              getNavLinkClass(activeNav.isActive, "/manage")
            }
            to="manage"
          >
            <SidebarLink
              title="Manage"
              icon={
                <Gear
                  weight={active === "/manage" ? "fill" : "bold"}
                  size={16}
                />
              }
              variant="primary-link"
            />
          </NavLink>
          <NavLink
            to={config.endpoints.docs}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SidebarLink title="Help" icon={<IconHelp />} />
          </NavLink>
        </div>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;
