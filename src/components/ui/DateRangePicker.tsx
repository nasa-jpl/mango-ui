import { DatePicker } from "@nasa-jpl/react-stellar";
import { Button } from "@nasa-jpl/stellar-react";
import { useEffect, useState } from "react";
import { DateFormat } from "../../types/view";

export declare type DateRangePickerProps = {
  dateFormat?: DateFormat;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
  startDate: Date;
};

const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate < endDate;
};

export const DateRangePicker = ({
  dateFormat = "long",
  endDate,
  startDate,
  onChange = () => {},
}: DateRangePickerProps) => {
  const [internalStartDate, setInternalStartDate] = useState(startDate);
  const [internalEndDate, setInternalEndDate] = useState(endDate);
  const [prevPropDateRange, setPrevPropDateRange] = useState("");

  useEffect(() => {
    const dateRangeString = `${startDate.toISOString()}_${endDate.toISOString()}`;
    if (dateRangeString !== prevPropDateRange) {
      setInternalStartDate(startDate);
      setInternalEndDate(endDate);
      setPrevPropDateRange(dateRangeString);
    }
  }, [startDate, endDate, prevPropDateRange]);

  const valid = isValidDateRange(internalStartDate, internalEndDate);
  const formatString = dateFormat === "short" ? "yyyy/MM/dd" : undefined;
  const minWidth = dateFormat === "short" ? 70 : 164;

  const submit = () => {
    if (!isValidDateRange(internalStartDate, internalEndDate)) {
      return;
    }
    onChange(internalStartDate, internalEndDate);
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <DatePicker
        formatString={formatString}
        label="Start"
        date={internalStartDate}
        minWidth={minWidth}
        errorString={!valid ? "Start > end date" : ""}
        onChange={(date) => {
          const finalDate = new Date(date.getTime());
          if (dateFormat === "short") {
            finalDate.setUTCHours(0, 0, 0, 0);
          }
          setInternalStartDate(finalDate);
        }}
      />
      <DatePicker
        formatString={formatString}
        label="End"
        date={internalEndDate}
        minWidth={minWidth}
        onChange={(date) => {
          const finalDate = new Date(date.getTime());
          if (dateFormat === "short") {
            finalDate.setUTCHours(23, 59, 59, 999);
          }
          setInternalEndDate(finalDate);
        }}
      />
      <Button variant="outline" onClick={submit}>
        Go
      </Button>
    </div>
  );
};

export default DateRangePicker;
