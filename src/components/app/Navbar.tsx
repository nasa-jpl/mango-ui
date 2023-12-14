import {
  Avatar,
  Button,
  IconArrowRight,
  IconChevronDown,
  Menu,
  MenuItem,
  MenuLabel,
  MenuRightSlot,
  NavbarBrand,
  NavbarBreakpoint,
  NavbarContent,
  NavbarLink,
  NavbarMobileMenu,
  Navbar as StellarNavbar,
} from "@nasa-jpl/react-stellar";
import "./Navbar.css";

export declare type NavbarProps = {};

export const Navbar = ({}: NavbarProps) => {
  return (
    <StellarNavbar mobileBreakpoint={800}>
      <NavbarBreakpoint min={800}>
        <NavbarBrand
          title={import.meta.env.VITE_APP_TITLE}
          version={APP_VERSION}
        />
        {/* <NavbarLink href="#">Page 1</NavbarLink> */}
        <NavbarContent align="right" full>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "var(--st-grid-unit2x)",
            }}
          >
            {/* <Button variant="secondary">Action 1</Button>
            <Button>Action 2</Button> */}
            <Menu
              trigger={
                <Button
                  size="large"
                  style={{ gap: "4px", padding: "0 var(--st-grid-unit)" }}
                  variant="tertiary"
                >
                  <Avatar text="K" />
                  <IconChevronDown />
                </Button>
              }
            >
              <MenuLabel>Welcome kjaneway</MenuLabel>
              {/* <MenuItem>Account Settings</MenuItem> */}
              <MenuItem>
                Logout
                <MenuRightSlot>
                  <IconArrowRight />
                </MenuRightSlot>
              </MenuItem>
            </Menu>
          </div>
        </NavbarContent>
      </NavbarBreakpoint>
      <NavbarBreakpoint max={800}>
        <NavbarContent align="center" full>
          <NavbarBrand title="GMAT" />
        </NavbarContent>
        <NavbarContent align="right">
          <Menu
            trigger={
              <Button
                size="large"
                style={{ gap: "4px", padding: "0 var(--st-grid-unit)" }}
                variant="tertiary"
              >
                <Avatar text="K" />
                <IconChevronDown />
              </Button>
            }
          >
            <MenuLabel>Welcome kjaneway</MenuLabel>
            <MenuItem>Account Settings</MenuItem>
            <MenuItem>
              Logout
              <MenuRightSlot>
                <IconArrowRight />
              </MenuRightSlot>
            </MenuItem>
          </Menu>
        </NavbarContent>
      </NavbarBreakpoint>
      <NavbarMobileMenu>
        <NavbarLink href="#">Page 1</NavbarLink>
      </NavbarMobileMenu>
    </StellarNavbar>
  );
};

export default Navbar;
