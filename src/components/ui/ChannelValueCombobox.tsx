import { Check, ChevronsUpDown } from "lucide-react";

import {
  Button,
  cn,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nasa-jpl/stellar-react";
import { useMemo, useState } from "react";
import {
  CHANNEL_VALUE_RESULT_LIMIT,
  filterChannelValues,
  sortChannelValues,
} from "./entity-editor-utils";

export declare type ChannelValueComboboxProps = {
  onChange: (value: string) => void;
  value?: string;
  values: string[];
};

/**
 * Searchable picker for a channel field's value. Channel value lists can run to tens of thousands
 * of entries (e.g. OFFRED), so matching is done here and only a capped subset is rendered.
 */
export const ChannelValueCombobox = ({
  onChange,
  value,
  values,
}: ChannelValueComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sortedValues = useMemo(() => sortChannelValues(values), [values]);
  const { matches, total } = useMemo(
    () => filterChannelValues(sortedValues, query),
    [sortedValues, query],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-24 max-w-96 flex overflow-hidden items-center gap-2 p-2 justify-between h-[26px]"
        >
          <div className="block overflow-hidden text-ellipsis">
            {value ? (
              value
            ) : (
              <div className="text-muted-foreground font-normal">
                Select value
              </div>
            )}
          </div>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 max-w-fit min-w-fit" align="start">
        <Command className="min-w-fit" shouldFilter={false}>
          <CommandInput
            placeholder="Search values..."
            value={query}
            onValueChange={setQuery}
            asChild
          >
            <Input
              className="border-none h-8 focus-visible:outline-none focus-visible:ring-0 text-xs"
              sizeVariant="sm"
            />
          </CommandInput>
          <CommandList className="min-w-fit">
            <CommandEmpty className="py-4 text-center text-xs">
              No value found.
            </CommandEmpty>
            <CommandGroup className="min-w-fit">
              {matches.map((match) => (
                <CommandItem
                  className="text-xs min-w-fit"
                  key={match}
                  value={match}
                  onSelect={() => {
                    onChange(match);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "",
                      match === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {match}
                </CommandItem>
              ))}
            </CommandGroup>
            {total > CHANNEL_VALUE_RESULT_LIMIT && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Showing {CHANNEL_VALUE_RESULT_LIMIT} of {total} values. Type to
                narrow the list.
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
