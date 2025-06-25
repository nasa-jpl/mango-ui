import { GripHorizontal, TriangleAlert } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

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
    <div className="items-center bg-gray-50 border-b flex flex-shrink-0 h-8 justify-between pl-[10px]">
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {title}
      </div>
      {children}
      <div className="items-center flex h-full">
        {rightContent}
        {loading && (
          <div className="items-center text-muted-foreground text-[10px] select-none">
            Loading
          </div>
        )}
        {error && (
          <Tooltip content={error.message}>
            <div className="text-red-500 flex">
              <TriangleAlert size={16} />
            </div>
          </Tooltip>
        )}
        <div className="cursor-move flex justify-center w-[28px] entity-drag-handle text-muted-foreground">
          <GripHorizontal size={16} />
        </div>
      </div>
    </div>
  );
};

export default EntityHeader;
