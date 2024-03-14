import "./PageHeader.css";

export declare type PageHeaderProps = {
  children?: React.ReactNode;
  title?: string;
};

export const PageHeader = ({ title = "", children }: PageHeaderProps) => {
  return (
    <header className="page-header">
      <div className="page-header-title st-typography-displayBody">{title}</div>
      <div className="page-header-children">{children}</div>
    </header>
  );
};

export default PageHeader;
