import {
  Button,
  IconCaretDown,
  IconCaretRight,
} from "@nasa-jpl/react-stellar/";
import classNames from "classnames";
import { useState } from "react";
import "./Section.css";

export declare type SectionProps = {
  title?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
};

export const Section = ({
  title = "",
  defaultOpen = false,
  children,
}: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={classNames("section", { "section--open": open })}>
      <Button variant="tertiary" onClick={() => setOpen(!open)}>
        {open ? <IconCaretDown /> : <IconCaretRight />}
        {title}
      </Button>
      <div className="section-content">{children}</div>
    </div>
  );
};

export default Section;
