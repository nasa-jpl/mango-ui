import classNames from "classnames";
import "./Page.css";
import PageHeader from "./PageHeader";

export declare type PageHeaderProps = {
  title?: string;
  padBody?: boolean;
  pageHeaderChildren?: React.ReactNode;
  children?: React.ReactNode;
};

export const Page = ({
  title = "",
  padBody = false,
  pageHeaderChildren,
  children,
}: PageHeaderProps) => {
  return (
    <div className={classNames("page", { "page--padded": padBody })}>
      <PageHeader title={title}>{pageHeaderChildren}</PageHeader>
      <div className="page-body">{children}</div>
    </div>
  );
};

export default Page;
