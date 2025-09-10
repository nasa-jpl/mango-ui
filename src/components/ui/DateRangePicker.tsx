import {
  Button,
  DateRangePicker as DateRangePickerStellar,
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
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  minDate = new Date("2010-01-01T00:00:00"),
  maxDate = new Date("2100-12-01T00:00:00"),
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new TZDate(startDate, "UTC"),
    to: new TZDate(endDate, "UTC"),
  });
  const [dateRangeError, setDateRangeError] = useState<string>("");
  const [prevPropDateRange, setPrevPropDateRange] = useState("");

  useEffect(() => {
    const dateRangeString = `${startDate.toGPSString()}_${endDate.toGPSString()}`;
    if (dateRangeString !== prevPropDateRange) {
      setPrevPropDateRange(dateRangeString);
      setDateRange({
        from: new TZDate(startDate, "UTC"),
        to: new TZDate(endDate, "UTC"),
      });
      setDateRangeError("");
    }
  }, [startDate, endDate, prevPropDateRange]);

  const onDateChange = useCallback(
    (startDate: Date, endDate: Date) => {
      if (dateFormat === "short") {
        const newRange = [
          new Date(startOfDay(new TZDate(startDate, "UTC"))),
          new Date(endOfDay(new TZDate(endDate, "UTC"))),
        ];
        onChange(newRange[0], newRange[1]);
      } else {
        onChange(startDate, endDate);
      }
    },
    [dateFormat, onChange]
  );

  const formatDate = useCallback(
    (date: Date) => {
      if (dateFormat === "short") {
        return format(date, "yyyy-MM-dd");
      } else {
        return date.toGPSString();
      }
    },
    [dateFormat]
  );

  const handleDateRangePickerEvent = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
      which: "from" | "to",
      inputValues: { from: string; to: string }
    ) => {
      let dateString = (e.target as HTMLInputElement).value;
      let otherDateString = inputValues[which === "from" ? "to" : "from"];
      if (dateFormat === "short") {
        dateString += "T00:00:00";
        otherDateString += "T00:00:00";
      }
      // Treat GPS time string as UTC otherwise 7 hours will be added
      const eventDate = dateString.endsWith("Z")
        ? parseDateStringISO(dateString)
        : parseDateStringISO(dateString + "Z");
      const eventVerb = which === "from" ? "start" : "end";
      const otherDate = otherDateString.endsWith("Z")
        ? parseDateStringISO(otherDateString)
        : parseDateStringISO(otherDateString + "Z");
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
    },
    [maxDate, minDate, onDateChange, dateFormat]
  );

  const onDateRangeKeyUp = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement>,
      which: "from" | "to",
      inputValues: { from: string; to: string }
    ) => {
      const { key } = e;
      if (key === "Enter") {
        handleDateRangePickerEvent(e, which, inputValues);
      }
    },
    [handleDateRangePickerEvent]
  );

  const memoizedDatePicker = useMemo(
    () => (
      <DateRangePickerStellar
        className={dateFormat === "long" ? "w-[174px]" : "w-[92px]"}
        size="sm"
        startMonth={minDate}
        endMonth={maxDate}
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
                  from: new Date(startOfDay(new TZDate(new Date(), "UTC"))),
                  to: new Date(endOfDay(new TZDate(new Date(), "UTC"))),
                });
                onDateChange(
                  new Date(startOfDay(new TZDate(new Date(), "UTC"))),
                  new Date(endOfDay(new TZDate(new Date(), "UTC")))
                );
                setDateRangeError("");
              }}
            >
              <CalendarArrowDown size={16} /> Today
            </Button>
          </div>
        }
      />
    ),
    [
      dateFormat,
      dateRange,
      endDate,
      formatDate,
      handleDateRangePickerEvent,
      onDateChange,
      onDateRangeKeyUp,
      startDate,
      minDate,
      maxDate,
    ]
  );

  return (
    <div className="flex flex-col items-start h-min">
      {memoizedDatePicker}
      <div className="p-1 text-xs font-medium text-destructive">
        {dateRangeError}
      </div>
    </div>
  );
}
