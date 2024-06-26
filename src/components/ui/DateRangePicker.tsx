import { DatePicker } from "@nasa-jpl/react-stellar";
import { useState } from "react";

export declare type DateRangePickerProps = {
  endDate: Date;
  onEndDateChange: (date: Date) => void;
  onStartDateChange: (date: Date) => void;
  startDate: Date;
};

const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate < endDate;
};

export const DateRangePicker = ({
  endDate,
  startDate,
  onEndDateChange = () => {},
  onStartDateChange = () => {},
}: DateRangePickerProps) => {
  const [internalStartDate, setInternalStartDate] = useState(startDate);
  const [internalEndDate, setInternalEndDate] = useState(endDate);

  const valid = isValidDateRange(internalStartDate, internalEndDate);
  return (
    <div
      style={{ display: "flex", gap: "8px" }}
      onFocusCapture={(e) => {
        // e.stopPropagation();
      }}
    >
      <DatePicker
        label="Start"
        date={startDate}
        minWidth={164}
        errorString={!valid ? "Start date is after end date" : ""}
        onChange={(date) => {
          setInternalStartDate(date);
          if (!isValidDateRange(date, internalEndDate)) {
            return;
          }
          onStartDateChange(date);
        }}
      />
      <DatePicker
        label="End"
        date={endDate}
        minWidth={164}
        onChange={(date) => {
          setInternalEndDate(date);
          if (!isValidDateRange(internalStartDate, date)) {
            return;
          }
          onEndDateChange(date);
        }}
      />
    </div>
  );
};

export default DateRangePicker;
