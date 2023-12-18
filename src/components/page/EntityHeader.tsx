import "./EntityHeader.css";

export declare type EntityHeaderProps = {
  title?: string;
  children?: React.ReactNode;
};

export const EntityHeader = ({ title = "", children }: EntityHeaderProps) => {
  return (
    <div className="entity-header">
      <div className="entity-header-title st-typography-label">{title}</div>
      {children}
    </div>
  );
};

export default EntityHeader;
