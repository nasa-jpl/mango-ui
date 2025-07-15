import classNames from "classnames";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
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
      {status === "nominal" && <Check size={16} />}
      {status === "error" && <TriangleAlert size={16} />}
      {status === "warning" && <CircleAlert size={16} />}
      {children}
    </div>
  );
};

export default StatusBadge;
