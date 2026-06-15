// @ts-nocheck
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// Custom caption component with year and month dropdowns for v9
// Uses native <select> elements to avoid Radix portal conflicts with Popover
function CustomMonthCaption({
  calendarMonth,
  onMonthChange,
  captionMinYear,
  captionMaxYear,
}: {
  calendarMonth: { date: Date };
  onMonthChange?: (date: Date) => void;
  /** When set with captionMaxYear, restricts the year dropdown (e.g. Showcase DOB). */
  captionMinYear?: number;
  captionMaxYear?: number;
}) {
  const displayMonth = calendarMonth.date;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const maxYear = captionMaxYear ?? currentYear;
  const minYear = captionMinYear ?? 1990;
  const years = Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, i) => maxYear - i
  );

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(parseInt(e.target.value));
    onMonthChange?.(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(displayMonth);
    newDate.setFullYear(parseInt(e.target.value));
    onMonthChange?.(newDate);
  };

  return (
    <div className="flex justify-center gap-2 mb-2">
      <select
        value={displayMonth.getMonth()}
        onChange={handleMonthChange}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
      >
        {months.map((month, index) => (
          <option key={month} value={index}>
            {month}
          </option>
        ))}
      </select>

      <select
        value={displayMonth.getFullYear()}
        onChange={handleYearChange}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  captionMinYear?: number;
  captionMaxYear?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month: monthProp,
  onMonthChange,
  selected,
  captionMinYear,
  captionMaxYear,
  ...props
}: CalendarProps) {
  // Use controlled month if provided, otherwise use internal state
  const [internalMonth, setInternalMonth] = React.useState<Date>(() => {
    if (selected && selected instanceof Date && !isNaN(selected.getTime())) {
      return selected;
    }
    return new Date();
  });

  // Use either controlled or uncontrolled month
  const month = monthProp ?? internalMonth;
  const setMonth = onMonthChange ?? setInternalMonth;

  // Update internal month when selected date changes
  React.useEffect(() => {
    if (selected && selected instanceof Date && !isNaN(selected.getTime())) {
      setInternalMonth(selected);
    }
  }, [selected]);

  return (
    <DayPicker
      month={month}
      onMonthChange={setMonth}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      selected={selected}
      components={{
        MonthCaption: (captionProps) => (
          <CustomMonthCaption
            {...captionProps}
            onMonthChange={setMonth}
            captionMinYear={captionMinYear}
            captionMaxYear={captionMaxYear}
          />
        ),
        Chevron: (chevronProps) => {
          if (chevronProps.orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
