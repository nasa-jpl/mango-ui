import {
  Button,
  DateRangePicker as DateRangePickerStellar,
  formatDateISO,
  parseDateStringISO,
} from "@nasa-jpl/stellar-react";
import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  isValid,
  startOfDay,
} from "date-fns";
import { CalendarArrowDown, Eraser } from "lucide-react";
import { KeyboardEvent, useEffect, useState } from "react";
import { DateRange, TZDate } from "react-day-picker";
import { DateFormat } from "../../types/view";

export declare type DateRangePickerProps = {
  dateFormat?: DateFormat;
  endDate: Date;
  maxDate?: Date;
  minDate?: Date;
  onChange: (startDate: Date, endDate: Date) => void;
  startDate: Date;
};

export function DateRangePicker({
  dateFormat = "long",
  endDate,
  startDate,
  onChange = () => {},
  minDate = new Date("1000-01-01T00:00:00Z"),
  maxDate = new Date("3000-12-01T00:00:00Z"),
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new TZDate(startDate, "UTC"),
    to: new TZDate(endDate, "UTC"),
  });
  const [dateRangeError, setDateRangeError] = useState<string>("");

  useEffect(() => {
    setDateRange({
      from: new TZDate(startDate, "UTC"),
      to: new TZDate(endDate, "UTC"),
    });
  }, [startDate, endDate]);

  const onDateRangeKeyUp = (
    e: KeyboardEvent<HTMLInputElement>,
    which: "from" | "to",
    inputValues: { from: string; to: string }
  ) => {
    const { key } = e;
    if (key === "Enter") {
      handleDateRangePickerEvent(e, which, inputValues);
    }
  };

  const onDateChange = (startDate: Date, endDate: Date) => {
    if (dateFormat === "short") {
      const newRange = [
        new Date(startOfDay(new TZDate(startDate, "UTC"))),
        new Date(endOfDay(new TZDate(endDate, "UTC"))),
      ];
      onChange(newRange[0], newRange[1]);
    } else {
      onChange(startDate, endDate);
    }
  };

  const formatDate = (date: Date) => {
    if (dateFormat === "short") {
      return format(date, "yyyy-MM-dd");
    } else {
      return formatDateISO(date);
    }
  };

  const handleDateRangePickerEvent = (
    e: KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    which: "from" | "to",
    inputValues: { from: string; to: string }
  ) => {
    const dateString = (e.target as HTMLInputElement).value;
    const eventDate = parseDateStringISO(dateString);
    const eventVerb = which === "from" ? "start" : "end";
    const otherDate = parseDateStringISO(
      inputValues[which === "from" ? "to" : "from"]
    );
    const otherDateVerb = which === "from" ? "end" : "start";
    if (!dateString) {
      setDateRangeError(
        `${eventVerb === "start" ? "Start" : "End"} date required`
      );
    } else if (!eventDate || !isValid(eventDate)) {
      setDateRangeError(`Invalid ${eventVerb} date`);
    } else if (isBefore(eventDate, minDate) || isAfter(eventDate, maxDate)) {
      setDateRangeError("Date out of range");
    } else if (!otherDate || !isValid(otherDate)) {
      setDateRangeError(`Invalid ${otherDateVerb} date`);
    } else {
      const startDate = which === "from" ? eventDate : otherDate;
      const endDate = which === "to" ? eventDate : otherDate;
      if (isBefore(endDate, startDate)) {
        setDateRangeError("Start date must precede end date");
      } else {
        setDateRangeError("");
        setDateRange({ from: startDate, to: endDate });
        onDateChange(startDate, endDate);
      }
    }
  };

  return (
    <div className="flex flex-col items-start h-min">
      <DateRangePickerStellar
        className={dateFormat === "long" ? "w-[168px]" : "w-[92px]"}
        size="sm"
        startMonth={new Date("2020-02-01T00:00:00Z")}
        endMonth={new Date("2040-12-01T00:00:00Z")}
        timezone="UTC"
        selected={dateRange}
        onKeyUp={onDateRangeKeyUp}
        onBlur={handleDateRangePickerEvent}
        onCalendarSelect={(d) => {
          setDateRange(d);
          onDateChange(
            new Date(d.from || startDate),
            new Date(d.to || endDate)
          );
          setDateRangeError("");
        }}
        formatDate={formatDate}
        footer={
          <div className="mt-2 flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              variant="outline"
              onClick={() => setDateRange({ from: undefined, to: undefined })}
            >
              <Eraser size={16} /> Clear
            </Button>
            <Button
              size="lg"
              className="w-full"
              variant="outline"
              onClick={() => {
                setDateRange({
                  from: startOfDay(new TZDate(new Date(), "UTC")),
                  to: endOfDay(new TZDate(new Date(), "UTC")),
                });
                onDateChange(
                  startOfDay(new TZDate(new Date(), "UTC")),
                  endOfDay(new TZDate(new Date(), "UTC"))
                );
                setDateRangeError("");
              }}
            >
              <CalendarArrowDown size={16} /> Today
            </Button>
          </div>
        }
      />
      <div className="p-1 text-xs font-medium text-destructive">
        {dateRangeError}
      </div>
    </div>
  );
}
