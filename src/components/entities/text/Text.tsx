import { TextEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Text.css";

export declare type TextProps = {
  showHeader?: boolean;
  textEntity: TextEntity;
};

export function Text({ textEntity, showHeader = true }: TextProps) {
  return (
    <div className="text-entity">
      {showHeader && <EntityHeader title={textEntity.title} />}
      <div className="text-entity--text font-medium">{textEntity.text}</div>
    </div>
  );
}

export default Text;
