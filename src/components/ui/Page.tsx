import classNames from "classnames";
import PageHeader from "./PageHeader";

export declare type PageHeaderProps = {
  children?: React.ReactNode;
  padBody?: boolean;
  pageHeaderChildren?: React.ReactNode;
  title?: string;
};

export const Page = ({
  title = "",
  padBody = false,
  pageHeaderChildren,
  children,
}: PageHeaderProps) => {
  return (
    <div className={classNames("flex flex-col overflow-auto w-full")}>
      <PageHeader title={title}>{pageHeaderChildren}</PageHeader>
      <div
        className={classNames(
          "flex flex-col h-full w-full overflow-auto border-t bg-secondary",
          {
            "p-4": padBody,
          }
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Page;
