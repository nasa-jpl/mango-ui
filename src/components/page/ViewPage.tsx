import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nasa-jpl/stellar-react";
import { ChevronDown, Folder, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DataResponseDataEntry, Product } from "../../types/api";
import { PageOptions, ProductPreview } from "../../types/page";
import { DateRange } from "../../types/time";
import {
  ChartEntity,
  Entity,
  Page as PageType,
  SectionLayout,
  Section as SectionType,
} from "../../types/view";
import { generateUUID } from "../../utilities/generic";
import {
  createEntity,
  duplicateEntity,
  duplicateSection,
} from "../../utilities/view";
import { useConfirm } from "../ui/AlertDialogProvider";
import { DateRangePicker } from "../ui/DateRangePicker";
import EntityEditor from "../ui/EntityEditor";
import Page from "../ui/Page";
import * as Tabs from "../ui/Tabs";
import { Tooltip } from "../ui/Tooltip";
import Section from "./Section";

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
  const startDate = new Date("2023-06-03T00:00:00Z").toISOString();
  const endDate = new Date("2023-06-10T23:59:59.999Z").toISOString();
  const [dateRange, setDateRange] = useState<DateRange>({
    end: endDate,
    start: startDate,
  });
  const [mission, setMission] = useState<string | null>(
    viewPage?.missions ? viewPage?.missions[0].mission ?? null : null
  );
  const [instrument, setInstrument] = useState<string | null>(
    viewPage?.missions ? viewPage?.missions[0].instrument ?? null : null
  );
  const [entityToEdit, setEntityToEdit] = useState<Entity | null>(null);

  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selectedPoint, setSelectedPoint] =
    useState<DataResponseDataEntry | null>(null);
  const [pageOptions, setPageOptions] = useState<PageOptions>({
    showHoverDate: true,
  });

  const confirm = useConfirm();

  useEffect(() => {
    setMission(
      viewPage?.missions ? viewPage?.missions[0].mission ?? null : null
    );
    setInstrument(
      viewPage?.missions ? viewPage?.missions[0].instrument ?? null : null
    );
  }, [viewPage?.missions]);

  // TODO would be an improvement to prevent user navigation while editing an
  // entity to prevent accidental deletion of work but this will need to be controlled
  // from higher up in the routing
  const location = useLocation();
  useEffect(() => {
    setEntityToEdit(null);
  }, [location]);

  const onEntityDelete = useCallback(
    async (entity: Entity, section: SectionType) => {
      if (!viewPage) {
        return;
      }

      const confirmed = await confirm({
        title: "Are you sure?",
        body: "This action will only be persisted upon saving view changes.",
        cancelButton: "Cancel",
        actionButtonVariant: "destructive",
        actionButton: "Delete",
      });

      if (!confirmed) {
        return;
      }

      const updatedViewPage: PageType = {
        ...viewPage,
        sections: viewPage?.sections.map((s) => {
          if (s.id === section.id) {
            const newEntities: Entity[] = [];
            const newLayout = [...s.layout];
            s.entities.forEach((e, i) => {
              if (e.id === entity.id) {
                newLayout.splice(i, 1);
              } else {
                newEntities.push(e);
              }
            });
            return {
              ...s,
              entities: newEntities,
              layout: newLayout,
            };
          }
          return s;
        }),
      };
      onPageChange(updatedViewPage);
    },
    [viewPage, onPageChange, confirm]
  );

  const onEntityDuplicate = useCallback(
    (entity: Entity, section: SectionType) => {
      if (!viewPage) {
        return;
      }
      const updatedViewPage: PageType = {
        ...viewPage,
        sections: viewPage?.sections.map((s) => {
          if (s.id === section.id) {
            return duplicateEntity(entity, section);
          }
          return s;
        }),
      };
      onPageChange(updatedViewPage);
    },
    [viewPage, onPageChange]
  );

  const onEntitySave = useCallback(
    (entity: Entity) => {
      if (!viewPage) {
        return;
      }
      // Find section containing entity
      const section = viewPage.sections.find((s) =>
        s.entities.find((e) => e.id === entity.id)
      );
      if (!section) {
        return;
      }
      const updatedViewPage: PageType = {
        ...viewPage,
        sections: viewPage?.sections.map((s) => {
          if (s.id === section.id) {
            return {
              ...s,
              entities: s.entities.map((e) => {
                if (e.id === entity.id) {
                  return entity;
                }
                return e;
              }),
            };
          }
          return s;
        }),
      };
      onPageChange(updatedViewPage);
      setEntityToEdit(null);
    },
    [viewPage, onPageChange]
  );

  const onAddSection = useCallback(() => {
    if (!viewPage) {
      return;
    }
    const newSection: SectionType = {
      entities: [],
      id: generateUUID(),
      layout: [],
      enableHeader: true,
      defaultOpen: true,
      title: "New Section",
    };
    const updatedViewPage: PageType = {
      ...viewPage,
      sections: viewPage?.sections.concat(newSection),
    };
    onPageChange(updatedViewPage);
    setEntityToEdit(null);
  }, [viewPage, onPageChange]);

  const onAddEntity = useCallback(
    (section: SectionType) => {
      if (!viewPage) {
        return;
      }
      const newEntity: ChartEntity = createEntity({ type: "chart" });
      const updatedViewPage: PageType = {
        ...viewPage,
        sections: viewPage.sections.map((s) => {
          if (s.id === section.id) {
            // TODO need to compute the next available spot for the new item instead of
            // letting the library append it to the bottom
            const newLayout: SectionLayout[] = [
              ...s.layout,
              { i: newEntity.id, w: 4, h: 2, x: 0, y: 0 },
            ];
            return {
              ...s,
              entities: s.entities.concat(newEntity),
              layout: s.layout.concat(newLayout),
            };
          }
          return s;
        }),
      };
      onPageChange(updatedViewPage);
      setEntityToEdit(null);
    },
    [viewPage, onPageChange]
  );

  const onSectionDelete = useCallback(
    async (section: SectionType) => {
      if (!viewPage) {
        return;
      }
      const confirmed = await confirm({
        title: "Are you sure?",
        body: "This action will only be persisted upon saving view changes.",
        cancelButton: "Cancel",
        actionButtonVariant: "destructive",
        actionButton: "Delete",
      });

      if (!confirmed) {
        return;
      }
      const newViewPage: PageType = {
        ...viewPage,
        sections: viewPage.sections.filter((s) => s.id !== section.id),
      };
      onPageChange(newViewPage);
    },
    [viewPage, onPageChange, confirm]
  );

  const onSectionDuplicate = useCallback(
    async (section: SectionType, insertAfter: number) => {
      if (!viewPage) {
        return;
      }
      const newSection = duplicateSection(section);
      const newViewPage: PageType = {
        ...viewPage,
        sections: [
          ...viewPage.sections.slice(0, insertAfter + 1),
          newSection,
          ...viewPage.sections.slice(insertAfter + 1),
        ],
      };
      onPageChange(newViewPage);
    },
    [viewPage, onPageChange]
  );

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="select-none ml-2"
                disabled={!!entityToEdit}
              >
                Add <ChevronDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={onAddSection}>
                <Folder /> Add Section
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => {}}>
                <ChartLine /> Add Entity
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <Tooltip content="Settings">
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings size={16} />
                </Button>
              </PopoverTrigger>
            </Tooltip>
            <PopoverContent collisionPadding={{ right: 16 }}>
              <div className="leading-none font-medium mb-4">Settings</div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-time-cursor"
                  checked={pageOptions.showHoverDate}
                  onCheckedChange={(checked) =>
                    setPageOptions({
                      ...pageOptions,
                      showHoverDate: checked as boolean,
                    })
                  }
                />
                <Label size="sm" htmlFor="show-time-cursor">
                  Show time cursor
                </Label>
              </div>
            </PopoverContent>
          </Popover>
        </>
      }
    >
      {loadingInitialData && (
        <div className="text-muted-foreground font-medium flex flex-1 justify-center items-center">
          Loading
        </div>
      )}
      {!loadingInitialData && viewPage.missions && viewPage.missions.length && (
        <div className="left-0 sticky top-0 z-[1]">
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
      {!loadingInitialData && entityToEdit && (
        <EntityEditor
          entity={entityToEdit}
          onCancel={() => setEntityToEdit(null)}
          onSave={onEntitySave}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          products={products}
        />
      )}
      {!loadingInitialData &&
        !entityToEdit &&
        viewPage.sections.map((section, i) => (
          <Section
            products={products}
            section={section}
            key={section.id}
            dateRange={dateRange}
            mission={viewPage.missions ? mission : null}
            instrument={viewPage.missions ? instrument : null}
            hoverDate={pageOptions.showHoverDate ? hoverDate : null}
            selectedPoint={selectedPoint}
            onAddEntity={() => onAddEntity(section)}
            onDateRangeChange={setDateRange}
            onHoverDateChange={setHoverDate}
            onSelectPoint={setSelectedPoint}
            onSetProductPreview={onSetProductPreview}
            onEntityDelete={onEntityDelete}
            onEntityDuplicate={onEntityDuplicate}
            onEntityEdit={(entity) => setEntityToEdit(entity)}
            onSectionDelete={onSectionDelete}
            onSectionDuplicate={() => onSectionDuplicate(section, i)}
            onSectionChange={(newSection: SectionType) => {
              const newViewPage: PageType = {
                ...viewPage,
                sections: viewPage.sections.map((s) => {
                  if (s.id === newSection.id) {
                    return newSection;
                  }
                  return s;
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
