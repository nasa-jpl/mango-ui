import { IconWarning, Tooltip } from "@nasa-jpl/react-stellar";
import { DotsSix } from "@phosphor-icons/react";
import "./EntityHeader.css";

export declare type EntityHeaderProps = {
  children?: React.ReactNode;
  error?: Error;
  loading?: boolean;
  rightContent?: React.ReactNode;
  title?: string;
};

export const EntityHeader = ({
  title = "",
  children,
  loading = false,
  error,
  rightContent,
}: EntityHeaderProps) => {
  return (
    <div className="entity-header">
      <div className="entity-header-title st-typography-label">{title}</div>
      {children}
      <div className="entity-header-right-content">
        {rightContent}
        {loading && (
          <div className="entity-loading st-typography-label">Loading</div>
        )}
        {error && (
          <Tooltip content={error.message}>
            <div className="entity-error st-typography-label">
              <IconWarning />
            </div>
          </Tooltip>
        )}
        <div className="entity-drag-handle">
          <DotsSix weight="bold" />
        </div>
      </div>
    </div>
  );
};

export default EntityHeader;
