import "./PageHeader.css";

export declare type PageHeaderProps = {
  title?: string;
  children?: React.ReactNode;
};

export const PageHeader = ({ title = "", children }: PageHeaderProps) => {
  return (
    <div className="page-header">
      <div className="page-header-title st-typography-displayBody">{title}</div>
      {children}
    </div>
  );
};

export default PageHeader;
