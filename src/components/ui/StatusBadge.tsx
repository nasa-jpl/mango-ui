import { IconCheck, IconWarning } from "@nasa-jpl/react-stellar";
import classNames from "classnames";
import { Status } from "../../types/status";
import "./StatusBadge.css";

export declare type StatusProps = {
  children?: React.ReactNode;
  status: Status;
};

export const StatusBadge = ({ status, children }: StatusProps) => {
  return (
    <div
      className={classNames("status-badge", {
        [`status-badge--${status}`]: true,
      })}
    >
      {status === "nominal" && <IconCheck />}
      {status === "error" && <IconWarning />}
      {children}
    </div>
  );
};

export default StatusBadge;
