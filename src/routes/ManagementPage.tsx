import {
  Alert,
  AlertAction,
  AlertCancel,
  Button,
  FormField,
  Input,
  Error as InputError,
  Label,
  Tooltip,
} from "@nasa-jpl/react-stellar";
import {
  ArrowDown,
  ArrowUp,
  File,
  Folder,
  Link,
  TrashSimple,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { PageGroup, Page as PageType, View } from "../types/view";
import { downloadJSON } from "../utilities/generic";
import { createViewPage, createViewPageGroup } from "../utilities/view";
import "./ManagementPage.css";

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
      <Alert
        description={`This action cannot be undone, are you sure you want to delete this ${item}?`}
        title="Are you sure?"
        trigger={
          <div>
            <Tooltip content={`Delete ${item}`}>
              <Button
                variant="icon"
                size="medium"
                className="management-page-button"
              >
                <TrashSimple size={16} />
              </Button>
            </Tooltip>
          </div>
        }
      >
        <>
          <AlertCancel asChild>
            <Button variant="secondary">Cancel</Button>
          </AlertCancel>
          <AlertAction asChild>
            <Button
              onClick={onDelete}
              style={{
                background: "var(--st-error-red)",
              }}
            >
              Delete
            </Button>
          </AlertAction>
        </>
      </Alert>
    );
  };

  const validateUrl = (
    url: string,
    id: string,
    thingsWithURL: { id: string; url: string }[]
  ) => {
    if (!url) {
      return "Value required";
    } else if (url.toLowerCase() === "manage") {
      return "'Manage' is not an allowed value";
    } else if (url.toLowerCase() === "products") {
      return "'Products' is not an allowed value";
    } else if (
      thingsWithURL
        .filter((p) => p.id !== id)
        .map((p) => p.url.toLowerCase())
        .indexOf(url.toLowerCase()) > -1
    ) {
      return "URL must be unique within grouping";
    }
    return "";
  };

  const validateTitle = (
    title: string,
    id: string,
    thingsWithTitle: { id: string; title: string }[]
  ) => {
    if (!title) {
      return "Value required";
    } else if (
      thingsWithTitle
        .filter((p) => p.id !== id)
        .map((p) => p.title.toLowerCase())
        .indexOf(title.toLowerCase()) > -1
    ) {
      return "Title must be unique within grouping";
    }
    return "";
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
    if (!files) {
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

  return (
    <Page title="Manage" padBody>
      <div className="entity management-page">
        <div className="st-typography-header">Configure Mango Pages</div>
        <div className="st-typography-body">
          {view.pageGroups.map((pageGroup, i) => {
            const urlInvalid = validateUrl(
              pageGroup.url,
              pageGroup.id,
              view.pageGroups
            );
            const titleInvalid = validateTitle(
              pageGroup.title,
              pageGroup.id,
              view.pageGroups
            );
            return (
              <div className="management-page-page-group" key={pageGroup.id}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    paddingTop: "16px",
                    alignItems: "flex-start",
                  }}
                >
                  <div className="st-typography-medium">
                    Page Group Title
                    <FormField>
                      <Input
                        leftAdornment={<Folder size={16} />}
                        className="management-page-input"
                        value={pageGroup.title}
                        error={!!titleInvalid}
                        onInput={(evt) =>
                          updatePageGroup({
                            ...pageGroup,
                            title: (evt.target as HTMLInputElement).value,
                          })
                        }
                      />
                      {titleInvalid && <InputError>{titleInvalid}</InputError>}
                    </FormField>
                  </div>
                  <div className="st-typography-medium">
                    URL
                    <FormField>
                      <Input
                        leftAdornment={<Link size={16} />}
                        className="management-page-input"
                        value={pageGroup.url}
                        error={!!urlInvalid}
                        onInput={(evt) =>
                          updatePageGroup({
                            ...pageGroup,
                            url: (evt.target as HTMLInputElement).value,
                          })
                        }
                      />
                      {urlInvalid && <InputError>{urlInvalid}</InputError>}
                    </FormField>
                  </div>
                  <div className="management-page-buttons">
                    {renderDeletionConfirmation("page group", () =>
                      deletePageGroup(pageGroup.id)
                    )}
                    <Tooltip content="Move up">
                      <Button
                        disabled={i === 0}
                        variant="icon"
                        size="medium"
                        className="management-page-button"
                        onClick={() => movePageGroup(pageGroup, "up")}
                      >
                        <ArrowUp size={16} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Move down">
                      <Button
                        disabled={i === view.pageGroups.length - 1}
                        variant="icon"
                        size="medium"
                        className="management-page-button"
                        onClick={() => movePageGroup(pageGroup, "down")}
                      >
                        <ArrowDown size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                <div className="management-page-pages">
                  {pageGroup.pages.map((page, j) => {
                    const urlInvalid = validateUrl(
                      page.url,
                      page.id,
                      pageGroup.pages
                    );
                    const titleInvalid = validateTitle(
                      page.title,
                      page.id,
                      pageGroup.pages
                    );
                    return (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                        key={page.id}
                      >
                        <div className="st-typography-medium">
                          Page Title
                          <FormField>
                            <Input
                              leftAdornment={<File size={16} />}
                              className="management-page-input"
                              value={page.title}
                              error={!!titleInvalid}
                              onInput={(evt) =>
                                updatePage(
                                  {
                                    ...page,
                                    title: (evt.target as HTMLInputElement)
                                      .value,
                                  },
                                  pageGroup.id
                                )
                              }
                            />
                            {titleInvalid && (
                              <InputError>{titleInvalid}</InputError>
                            )}
                          </FormField>
                        </div>
                        <div className="st-typography-medium">
                          URL
                          <FormField>
                            <Input
                              leftAdornment={<Link size={16} />}
                              className="management-page-input"
                              value={page.url}
                              error={!!urlInvalid}
                              onInput={(evt) =>
                                updatePage(
                                  {
                                    ...page,
                                    url: (evt.target as HTMLInputElement).value,
                                  },
                                  pageGroup.id
                                )
                              }
                            />
                            {urlInvalid && (
                              <InputError>{urlInvalid}</InputError>
                            )}
                          </FormField>
                        </div>
                        <div className="management-page-buttons">
                          {renderDeletionConfirmation("page", () =>
                            deletePage(pageGroup.id, page.id)
                          )}
                          <Tooltip content="Move up">
                            <Button
                              disabled={j === 0}
                              variant="icon"
                              size="medium"
                              className="management-page-button"
                              onClick={() => movePage(page, pageGroup, "up")}
                            >
                              <ArrowUp size={16} />
                            </Button>
                          </Tooltip>
                          <Tooltip content="Move down">
                            <Button
                              disabled={j === pageGroup.pages.length - 1}
                              variant="icon"
                              size="medium"
                              className="management-page-button"
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
                    variant="tertiary"
                    onClick={() => onNewPageClick(pageGroup.id)}
                  >
                    + New Page
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            variant="tertiary"
            onClick={onNewPageGroupClick}
            style={{ marginTop: "16px" }}
          >
            + New Page Group
          </Button>
        </div>
        <div className="management-page-upload-view">
          <div className="management-page-upload-view--inner">
            <FormField flow="vertical">
              <Label htmlFor="json-input" className="st-typography-label">
                Upload JSON View
              </Label>
              <Input
                error={!!uploadError}
                id="json-input"
                type="file"
                className="management-page-input"
                onInput={onJSONViewInput}
              />
              {uploadError && <InputError>{uploadError}</InputError>}
            </FormField>
            <div className="management-page-view-download">
              <Label htmlFor="view-download" className="st-typography-label">
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
