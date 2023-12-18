import { ChartEntity } from "../../../types/view";
import EntityHeader from "../../page/EntityHeader";
import "./Chart.css";

export declare type ChartProps = {
  chartEntity: ChartEntity;
};

export const Chart = ({ chartEntity }: ChartProps) => {
  return (
    <div>
      <EntityHeader title={chartEntity.title} />
      <div>Chart content</div>
    </div>
  );
};

export default Chart;
