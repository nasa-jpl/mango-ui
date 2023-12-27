import {
  Button,
  IconCaretDown,
  IconCaretRight,
} from "@nasa-jpl/react-stellar/";
import classNames from "classnames";
import { useState } from "react";
import "./Section.css";

export declare type SectionProps = {
  children?: React.ReactNode;
  defaultOpen?: boolean;
  title?: string;
};

export const Section = ({
  children,
  defaultOpen = false,
  title = "",
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
