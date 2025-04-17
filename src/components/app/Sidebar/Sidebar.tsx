import { Database, HelpCircle, House } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { config } from "../../../config";
import { View } from "../../../types/view";
import "./Sidebar.css";
import SidebarContainer from "./SidebarContainer";
import SidebarGroup from "./SidebarGroup";
import SidebarLink from "./SidebarLink";

export declare type SidebarProps = {
  title?: string;
  view?: View;
};

const logo = () => (
  <svg
    width="31"
    height="24"
    viewBox="0 0 31 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      opacity="0.6"
      d="M26.5391 12.001C26.5391 14.1766 25.8939 16.3033 24.6852 18.1123C23.4765 19.9212 21.7586 21.3311 19.7486 22.1637C17.7386 22.9962 15.5269 23.2141 13.3931 22.7896C11.2593 22.3652 9.29927 21.3175 7.76089 19.7792C6.22252 18.2408 5.17487 16.2808 4.75043 14.147C4.32599 12.0132 4.54383 9.80145 5.37639 7.79146C6.20896 5.78147 7.61885 4.06351 9.42779 2.85481C11.2367 1.64612 13.3635 1.00098 15.5391 1.00098C18.4564 1.00098 21.2543 2.1599 23.3172 4.2228C25.3801 6.2857 26.5391 9.0836 26.5391 12.001Z"
      fill="url(#paint0_linear_3680_3166)"
    />
    <path
      d="M30.1778 3.58561C29.2215 1.93686 26.6978 1.56561 22.8653 2.50311C21.091 1.13117 18.9675 0.284335 16.736 0.0588216C14.5045 -0.166692 12.2545 0.238153 10.2415 1.22736C8.22862 2.21658 6.53347 3.7505 5.34867 5.65488C4.16387 7.55926 3.53692 9.75776 3.53904 12.0006C3.53919 12.5151 3.57176 13.029 3.63654 13.5394C0.175287 17.1256 0.225287 19.2506 0.901537 20.4156C1.53904 21.5206 2.86904 22.0006 4.61904 22.0006C5.83406 21.9755 7.04193 21.8077 8.21779 21.5006C9.9923 22.8712 12.1156 23.7169 14.3465 23.9415C16.5774 24.1661 18.8266 23.7607 20.8388 22.7714C22.8509 21.7821 24.5453 20.2484 25.7297 18.3445C26.9141 16.4406 27.5409 14.2428 27.539 12.0006C27.5393 11.4887 27.5071 10.9772 27.4428 10.4694C29.0053 8.84436 30.0453 7.30061 30.399 5.97936C30.6428 5.06436 30.569 4.25936 30.1778 3.58561ZM15.539 2.00061C17.804 2.00294 20.0012 2.77303 21.772 4.18515C23.5429 5.59727 24.7827 7.56801 25.289 9.77561C23.1565 11.7831 20.2703 13.8419 17.5303 15.4169C14.0865 17.3931 11.099 18.6256 8.71654 19.3006C7.24913 17.932 6.22775 16.1533 5.78537 14.1961C5.34298 12.2389 5.50009 10.1939 6.23624 8.3272C6.97238 6.46053 8.25346 4.85873 9.9127 3.73033C11.5719 2.60193 13.5325 1.9992 15.539 2.00061ZM2.63154 19.4119C2.44904 19.0981 2.55029 18.5069 2.90904 17.7869C3.2638 17.1123 3.69542 16.481 4.19529 15.9056C4.69079 17.3412 5.4543 18.6698 6.44529 19.8206C4.28904 20.1831 2.94404 19.9519 2.63154 19.4119ZM15.539 22.0006C13.8529 22.0023 12.1942 21.5747 10.719 20.7581C13.4267 19.8005 16.0392 18.5928 18.5228 17.1506C21.2203 15.6019 23.6078 13.9231 25.5315 12.2656C25.4603 14.8696 24.3767 17.3431 22.5108 19.1609C20.645 20.9787 18.144 21.9974 15.539 22.0006ZM28.4665 5.46186C28.254 6.25061 27.6928 7.15311 26.8878 8.10311C26.3936 6.66577 25.63 5.3358 24.6378 4.18436C26.414 3.89061 28.059 3.91311 28.4503 4.58936C28.5628 4.78561 28.569 5.07936 28.4665 5.46186Z"
      fill="black"
    />
    <defs>
      <linearGradient
        id="paint0_linear_3680_3166"
        x1="10.5762"
        y1="3.93042"
        x2="21.7686"
        y2="18.036"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFC700" />
        <stop offset="1" stopColor="#FF3D00" />
      </linearGradient>
    </defs>
  </svg>
);

export const Sidebar = ({ title = "", view }: SidebarProps) => {
  const [, setActive] = useState("home");

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
    <SidebarContainer title={title} logo={logo()}>
      <div className="sidebar-padded-content">
        <NavLink
          className={(activeNav) => getNavLinkClass(activeNav.isActive, "/")}
          to="/"
        >
          <SidebarLink
            title="Home"
            icon={<House size={16} />}
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
            icon={<Database size={14} />}
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
          {/* <SidebarLink title="Settings" icon={<IconSettings />} /> */}
          <NavLink
            to={config.endpoints.docs}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SidebarLink title="Help" icon={<HelpCircle size={16} />} />
          </NavLink>
          {/* <SidebarLink title="Sign Out" icon={<IconExternalLink />} /> */}
        </div>
      </div>
    </SidebarContainer>
  );
};

export default Sidebar;
