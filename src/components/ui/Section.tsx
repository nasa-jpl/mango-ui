import {
  Button,
  IconCaretDown,
  IconCaretRight,
} from "@nasa-jpl/react-stellar/";
import classNames from "classnames";
import { useState } from "react";
import "./Section.css";

export declare type NavbarProps = {
  title?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
};

export const Section = ({
  title = "",
  defaultOpen = false,
  children,
}: NavbarProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={classNames("section", { "section--open": open })}>
      <Button variant="tertiary" onClick={() => setOpen(!open)}>
        {open ? <IconCaretDown /> : <IconCaretRight />}
        {title}
      </Button>
      {open && <div className="section-content">{children}</div>}
    </div>
  );
};

export default Section;
