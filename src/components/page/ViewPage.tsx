import {
  Button,
  IconSettings,
  Popover,
  PopoverContent,
  Switch,
  Tooltip,
} from "@nasa-jpl/react-stellar";
import { useState } from "react";
import { DataResponseDataEntry, Product } from "../../types/api";
import { PageOptions, ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import { Page as PageType, Section as SectionType } from "../../types/view";
import DateRangePicker from "../ui/DateRangePicker";
import Page from "../ui/Page";
import * as Tabs from "../ui/Tabs";
import Section from "./Section";
import "./ViewPage.css";

export declare type PageProps = {
  loadingInitialData: boolean;
  onPageChange: (page: PageType) => void;
  onSetProductPreview: (productPreview: ProductPreview) => void;
  products: Product[];
  viewPage?: PageType;
};

// TODO consider if we need to disambiguate View<Page|Entity|Section> from the component names?
export const ViewPage = ({
  products,
  loadingInitialData,
  viewPage,
  onPageChange,
  onSetProductPreview,
}: PageProps) => {
  // TODO maybe move this to RootPage and provide a dispatch in context
  // so that we can store dateRange, hoverDate, pageOptions, and preview product + initial values in a store
  // and not have to pass individual callbacks down through components? Or could have dispatch be on the entity level?
  const startDate = new Date("2022-03-03T00:00:00Z").toISOString();
  const endDate = new Date("2022-03-10T23:59:59Z").toISOString();
  const [dateRange, setDateRange] = useState<DateRange>({
    end: endDate,
    start: startDate,
  });
  const [mission, setMission] = useState<string | null>(
    viewPage?.missions ? viewPage?.missions[1].mission ?? null : null
  );
  const [instrument, setInstrument] = useState<string | null>(
    viewPage?.missions ? viewPage?.missions[1].instrument ?? null : null
  );

  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectedPoint, setSelectedPoint] =
    useState<DataResponseDataEntry | null>(null);
  const [pageOptions, setPageOptions] = useState<PageOptions>({
    showHoverDate: true,
  });

  if (!viewPage) {
    return;
  }

  return (
    <Page
      title={viewPage.title}
      pageHeaderChildren={
        <>
          <DateRangePicker
            dateFormat={viewPage.dateFormat}
            startDate={new Date(dateRange.start)}
            endDate={new Date(dateRange.end)}
            onChange={(startDate, endDate) => {
              setDateRange({
                start: startDate.toISOString(),
                end: endDate.toISOString(),
              });
            }}
          />

          <Popover
            contentProps={{ sideOffset: 41 }}
            trigger={
              <div>
                <Tooltip content="Settings">
                  <Button variant="icon">
                    <IconSettings />
                  </Button>
                </Tooltip>
              </div>
            }
          >
            <PopoverContent collisionPadding={{ right: 16 }}>
              <div
                className="st-typography-medium"
                style={{ marginBottom: "8px" }}
              >
                Settings
              </div>
              <Switch
                label="Show time cursor"
                checked={pageOptions.showHoverDate}
                onCheckedChange={(checked) =>
                  setPageOptions({ ...pageOptions, showHoverDate: checked })
                }
              />
            </PopoverContent>
          </Popover>
        </>
      }
    >
      {loadingInitialData && (
        <div className="st-typography-label loading-indicator">Loading</div>
      )}
      {!loadingInitialData && viewPage.missions && viewPage.missions.length && (
        <div>
          <Tabs.Root
            value={`${mission}_${instrument}`}
            onValueChange={(value) => {
              const [mission, instrument] = value.split("_");
              setMission(mission || null);
              setInstrument(instrument || null);
            }}
          >
            <Tabs.List>
              {viewPage.missions.map(({ mission, instrument }) => (
                <Tabs.Trigger
                  key={`${mission}_${instrument}`}
                  value={`${mission}_${instrument}`}
                >
                  {mission}&nbsp;
                  {instrument}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs.Root>
        </div>
      )}
      {!loadingInitialData &&
        viewPage.sections.map((section) => (
          <Section
            products={products}
            section={section}
            key={section.id}
            dateRange={dateRange}
            mission={mission}
            instrument={instrument}
            hoverDate={pageOptions.showHoverDate ? hoverDate : null}
            selectedPoint={selectedPoint}
            onDateRangeChange={setDateRange}
            onHoverDateChange={setHoverDate}
            onSelectPoint={setSelectedPoint}
            onSetProductPreview={onSetProductPreview}
            onSectionChange={(newSection: SectionType) => {
              const newViewPage: PageType = {
                ...viewPage,
                sections: viewPage.sections.map((e) => {
                  if (e.id === newSection.id) {
                    return newSection;
                  }
                  return e;
                }),
              };
              onPageChange(newViewPage);
            }}
          />
        ))}
    </Page>
  );
};

export default ViewPage;
