import {
  Button,
  IconSettings,
  Popover,
  PopoverContent,
  Switch,
  Tooltip,
} from "@nasa-jpl/react-stellar";
import { useState } from "react";
import { Product } from "../../types/api";
import { PageOptions, ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import { Page as PageType, Section as SectionType } from "../../types/view";
import DateRangePicker from "../ui/DateRangePicker";
import Page from "../ui/Page";
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
  const [dateRange, setDateRange] = useState<DateRange>({
    end: new Date(Date.UTC(2022, 2, 2, 0, 36)).toISOString(), //2022-03-02T00:36:00
    start: new Date(Date.UTC(2022, 2, 2, 0, 26)).toISOString(), //2022-03-02T00:26:00
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
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
            startDate={new Date(dateRange.start)}
            endDate={new Date(dateRange.end)}
            onStartDateChange={(date) => {
              setDateRange({
                end: dateRange.end,
                start: date.toISOString(),
              });
            }}
            onEndDateChange={(date) => {
              setDateRange({
                end: date.toISOString(),
                start: dateRange.start,
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
      {!loadingInitialData &&
        viewPage.sections.map((section) => (
          <Section
            products={products}
            section={section}
            key={section.id}
            dateRange={dateRange}
            hoverDate={pageOptions.showHoverDate ? hoverDate : null}
            onDateRangeChange={setDateRange}
            onHoverDateChange={setHoverDate}
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
