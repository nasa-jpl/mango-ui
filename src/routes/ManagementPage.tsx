import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
} from "@nasa-jpl/stellar-react";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { z } from "zod";
import { InputForm } from "../components/ui/InputForm";
import Page from "../components/ui/Page";
import { Tooltip } from "../components/ui/Tooltip";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { PageGroup, Page as PageType, View } from "../types/view";
import { downloadJSON, generateUUID } from "../utilities/generic";
import { createViewPage, createViewPageGroup } from "../utilities/view";

export default function ManagementPage() {
  // TODO type outlet context instead of duplicating
  const [view, setView] =
    useOutletContext<
      [
        View,
        React.Dispatch<React.SetStateAction<View>>,
        Product[],
        React.Dispatch<React.SetStateAction<ProductPreview>>,
        boolean
      ]
    >();

  const [uploadError, setUploadError] = useState<string>("");

  const onNewPageClick = (pageGroupId: string) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.map((pg) => {
        if (pg.id === pageGroupId) {
          return {
            ...pg,
            pages: [
              ...pg.pages,
              createViewPage({ url: "new-page", title: "New Page" }),
            ],
          };
        }
        return pg;
      }),
    };
    setView(newView);
  };

  const onNewPageGroupClick = () => {
    const newView = {
      ...view,
      pageGroups: [
        ...view.pageGroups,
        createViewPageGroup({ url: "new-page-group", title: "New Page Group" }),
      ],
    };
    setView(newView);
  };

  const updatePageGroup = (updatedPageGroup: PageGroup) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.map((pg) => {
        if (pg.id === updatedPageGroup.id) {
          return updatedPageGroup;
        }
        return pg;
      }),
    };
    setView(newView);
  };

  const updatePage = (updatedPage: PageType, pageGroupdId: string) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.map((pg) => {
        if (pg.id === pageGroupdId) {
          return {
            ...pg,
            pages: pg.pages.map((p) => {
              if (p.id === updatedPage.id) {
                return updatedPage;
              }
              return p;
            }),
          };
        }
        return pg;
      }),
    };
    setView(newView);
  };

  const deletePageGroup = (pageGroupId: string) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.filter((pg) => {
        return pg.id !== pageGroupId;
      }),
    };
    setView(newView);
  };

  const duplicatePageGroup = (pageGroup: PageGroup, insertAfter: number) => {
    const newPageGroup = {
      ...pageGroup,
      id: generateUUID(),
      title: `${pageGroup.title} Copy`,
      url: `${pageGroup.url}_copy`,
    };
    const newView = {
      ...view,
      pageGroups: [
        ...view.pageGroups.slice(0, insertAfter + 1),
        newPageGroup,
        ...view.pageGroups.slice(insertAfter + 1),
      ],
    };
    setView(newView);
  };

  const deletePage = (pageGroupId: string, pageId: string) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.map((pg) => {
        if (pg.id === pageGroupId) {
          return { ...pg, pages: pg.pages.filter((p) => p.id !== pageId) };
        }
        return pg;
      }),
    };
    setView(newView);
  };

  const renderDeletionConfirmation = (item: string, onDelete: () => void) => {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <div>
            <Tooltip content={`Delete ${item}`}>
              <Button variant="ghost" size="icon">
                <Trash2 />
              </Button>
            </Tooltip>
          </div>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone, are you sure you want to delete this{" "}
              {item}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              {/* TODO why isn't variant overriding base tw classes in here with asChild? */}
              <Button
                variant="destructive"
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const movePageGroup = (pageGroup: PageGroup, direction: "up" | "down") => {
    const newPageGroups = [...view.pageGroups];
    const pgIndex = newPageGroups.findIndex((pg) => pg.id === pageGroup.id);
    if (pgIndex < 0) {
      return;
    }
    if (direction === "up") {
      if (pgIndex > 0) {
        const oldRow = newPageGroups[pgIndex - 1];
        newPageGroups[pgIndex - 1] = pageGroup;
        newPageGroups[pgIndex] = oldRow;
      }
    } else if (direction === "down") {
      if (pgIndex < newPageGroups.length - 1) {
        const oldRow = newPageGroups[pgIndex + 1];
        newPageGroups[pgIndex + 1] = pageGroup;
        newPageGroups[pgIndex] = oldRow;
      }
    }
    setView({ ...view, pageGroups: newPageGroups });
  };

  const duplicatePage = (
    page: PageType,
    pageGroup: PageGroup,
    insertAfter: number
  ) => {
    const newPage = {
      ...page,
      id: generateUUID(),
      title: `${page.title} Copy`,
      url: `${page.url}_copy`,
    };
    const newPageGroup: PageGroup = {
      ...pageGroup,
      pages: [
        ...pageGroup.pages.slice(0, insertAfter + 1),
        newPage,
        ...pageGroup.pages.slice(insertAfter + 1),
      ],
    };
    updatePageGroup(newPageGroup);
  };

  const movePage = (
    page: PageType,
    pageGroup: PageGroup,
    direction: "up" | "down"
  ) => {
    const newPages = [...pageGroup.pages];
    const pageIndex = newPages.findIndex((p) => p.id === page.id);
    if (pageIndex < 0) {
      return;
    }
    if (direction === "up") {
      if (pageIndex > 0) {
        const oldRow = newPages[pageIndex - 1];
        newPages[pageIndex - 1] = page;
        newPages[pageIndex] = oldRow;
      }
    } else if (direction === "down") {
      if (pageIndex < newPages.length - 1) {
        const oldRow = newPages[pageIndex + 1];
        newPages[pageIndex + 1] = page;
        newPages[pageIndex] = oldRow;
      }
    }
    updatePageGroup({ ...pageGroup, pages: newPages });
  };

  const downloadView = async () => {
    downloadJSON(view, "mango-view");
  };

  const onJSONViewInput = async (evt: FormEvent<HTMLInputElement>) => {
    const files = (evt.target as HTMLInputElement).files;
    if (!files || !files.length) {
      return;
    }
    const file = files[0];
    try {
      const fileString = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = reject;

        reader.readAsText(file);
      });
      const viewJSON = JSON.parse(fileString);
      // TODO perform more validation
      if (
        !viewJSON.pageGroups ||
        typeof viewJSON.version !== "number" ||
        !viewJSON.home
      ) {
        throw new Error("View is invalid");
      }
      setView(viewJSON);
      setUploadError("");
    } catch (err) {
      console.log("Error uploading view :>> ", err);
      setUploadError((err as Error).message);
    }
  };

  const SidebarWidthFormSchema = z.object({
    sidebarWidth: z.coerce.number().min(180).max(500).int(),
  });

  return (
    <Page title="Manage" padBody>
      <div className="overflow-auto p-4 bg-background border rounded">
        <div className="text-lg font-medium">Configure Mango</div>
        <div className="mt-4 w-[600px]">
          <InputForm
            inputProps={{
              type: "number",
            }}
            formSchema={SidebarWidthFormSchema}
            defaultValue={view.config?.sidebarWidth?.toString() ?? "200"}
            name="sidebarWidth"
            label="Sidebar Width"
            onChange={(value) => {
              const config = view.config || {};
              setView({
                ...view,
                config: { ...config, sidebarWidth: parseInt(value) },
              });
            }}
          />
          {view.pageGroups.map((pageGroup, i) => {
            const otherPageGroups = view.pageGroups.filter(
              (p) => p.id !== pageGroup.id
            );
            const PageGroupURLFormSchema = z.object({
              url: z
                .string()
                .min(1, "URL must be defined")
                .refine(
                  (s) => s.toLowerCase() !== "manage",
                  "'Manage' is not an allowed value"
                )
                .refine(
                  (s) => s.toLowerCase() !== "products",
                  "'Products' is not an allowed value"
                )
                .refine(
                  (s) =>
                    otherPageGroups
                      .map((p) => p.url.toLowerCase())
                      .indexOf(s.toLowerCase()) < 0,
                  "URL used by another Page Group"
                ),
            });
            const PageGroupTitleFormSchema = z.object({
              title: z
                .string()
                .min(1, "Title must be defined")
                .refine(
                  (s) =>
                    otherPageGroups
                      .map((p) => p.title.toLowerCase())
                      .indexOf(s.toLowerCase()) < 0,
                  "Title used by another Page Group"
                ),
            });
            return (
              <div className="flex flex-col gap-2" key={pageGroup.id}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    paddingTop: "16px",
                    alignItems: "flex-start",
                  }}
                >
                  <InputForm
                    formSchema={PageGroupTitleFormSchema}
                    defaultValue={pageGroup.title}
                    name="title"
                    label="Page Group Title"
                    onChange={(value) =>
                      updatePageGroup({
                        ...pageGroup,
                        title: value,
                      })
                    }
                  />
                  <InputForm
                    formSchema={PageGroupURLFormSchema}
                    defaultValue={pageGroup.url}
                    name="url"
                    label="URL"
                    onChange={(value) =>
                      updatePageGroup({
                        ...pageGroup,
                        url: value,
                      })
                    }
                  />
                  <div className="flex self-end">
                    <Tooltip content="Duplicate Page">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicatePageGroup(pageGroup, i)}
                      >
                        <Copy size={16} />
                      </Button>
                    </Tooltip>
                    {renderDeletionConfirmation("page group", () =>
                      deletePageGroup(pageGroup.id)
                    )}
                    <Tooltip content="Move up">
                      <Button
                        disabled={i === 0}
                        variant="ghost"
                        size="icon"
                        onClick={() => movePageGroup(pageGroup, "up")}
                      >
                        <ArrowUp size={16} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Move down">
                      <Button
                        disabled={i === view.pageGroups.length - 1}
                        variant="ghost"
                        size="icon"
                        onClick={() => movePageGroup(pageGroup, "down")}
                      >
                        <ArrowDown size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="items-start border-l-[var(--app-border-color)] flex flex-col gap-2 pl-4 border-l w-full">
                  {pageGroup.pages.map((page, j) => {
                    const otherPages = pageGroup.pages.filter(
                      (p) => p.id !== page.id
                    );
                    const PageURLFormSchema = z.object({
                      url: z
                        .string()
                        .min(1, "URL must be defined")
                        .refine(
                          (s) => s.toLowerCase() !== "manage",
                          "'Manage' is not an allowed value"
                        )
                        .refine(
                          (s) => s.toLowerCase() !== "products",
                          "'Products' is not an allowed value"
                        )
                        .refine(
                          (s) =>
                            otherPages
                              .map((p) => p.url.toLowerCase())
                              .indexOf(s.toLowerCase()) < 0,
                          "URL used by another Page"
                        ),
                    });
                    const PageTitleFormSchema = z.object({
                      title: z
                        .string()
                        .min(1, "Title must be defined")
                        .refine(
                          (s) =>
                            otherPages
                              .map((p) => p.title.toLowerCase())
                              .indexOf(s.toLowerCase()) < 0,
                          "Title used by another Page"
                        ),
                    });
                    return (
                      <div className="flex gap-2 w-full" key={page.id}>
                        <InputForm
                          formSchema={PageURLFormSchema}
                          defaultValue={page.url}
                          name="url"
                          label="URL"
                          onChange={(value) =>
                            updatePage(
                              {
                                ...page,
                                url: value,
                              },
                              pageGroup.id
                            )
                          }
                        />
                        <InputForm
                          formSchema={PageTitleFormSchema}
                          defaultValue={page.title}
                          name="title"
                          label="Title"
                          onChange={(value) =>
                            updatePage(
                              {
                                ...page,
                                title: value,
                              },
                              pageGroup.id
                            )
                          }
                        />
                        <div className="flex self-end">
                          <Tooltip content="Duplicate Page Group">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicatePage(page, pageGroup, j)}
                            >
                              <Copy size={16} />
                            </Button>
                          </Tooltip>
                          {renderDeletionConfirmation("page", () =>
                            deletePage(pageGroup.id, page.id)
                          )}
                          <Tooltip content="Move up">
                            <Button
                              disabled={j === 0}
                              variant="ghost"
                              size="icon"
                              onClick={() => movePage(page, pageGroup, "up")}
                            >
                              <ArrowUp size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Move down">
                            <Button
                              disabled={j === pageGroup.pages.length - 1}
                              variant="ghost"
                              size="icon"
                              onClick={() => movePage(page, pageGroup, "down")}
                            >
                              <ArrowDown size={16} />
                            </Button>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    variant="secondary"
                    onClick={() => onNewPageClick(pageGroup.id)}
                  >
                    + New Page
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            variant="secondary"
            className="mt-4"
            onClick={onNewPageGroupClick}
          >
            + New Page Group
          </Button>
        </div>
        <div className="flex flex-1 mt-6 w-[400px]">
          <div className="flex flex-1 flex-col gap-4">
            <div className="space-y-1">
              <Label size="sm" htmlFor="upload">
                Upload JSON View
              </Label>
              <Input
                sizeVariant="xs"
                id="upload"
                type="file"
                accept=".json"
                onInput={onJSONViewInput}
              />
              {uploadError && (
                <div className="text-destructive text-xs font-normal">
                  {uploadError}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="view-download" size="sm">
                Download JSON View
              </Label>
              <Button
                id="view-download"
                variant="secondary"
                onClick={downloadView}
              >
                Download View
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
