import {
  Alert,
  AlertAction,
  AlertCancel,
  Button,
  Error,
  FormField,
  Input,
} from "@nasa-jpl/react-stellar";
import { File, Folder, Link, TrashSimple } from "@phosphor-icons/react";
import { useOutletContext } from "react-router-dom";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { PageGroup, Page as PageType, View } from "../types/view";
import { createViewPage, createViewPageGroup } from "../utilities/view";
import "./ManagementPage.css";

export default function ManagementPage() {
  // TODO type outlet context instead of duplicating
  const [view, setView, products, setProductPreview, loadingInitialData] =
    useOutletContext<
      [
        View,
        React.Dispatch<React.SetStateAction<View>>,
        Product[],
        React.Dispatch<React.SetStateAction<ProductPreview>>,
        boolean
      ]
    >();

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
          <Button
            variant="icon"
            size="medium"
            className="management-page-delete-button"
          >
            <TrashSimple size={16} />
          </Button>
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

  const validateUrl = (url: string) => {
    if (!url) {
      return "Value required";
    } else if (url.toLowerCase() === "manage") {
      return "'Manage' is not an allowed value";
    } else if (url.toLowerCase() === "products") {
      return "'Products' is not an allowed value";
    }
    return "";
  };

  const validateTitle = (title: string) => {
    if (!title) {
      return "Value required";
    }
    return "";
  };

  return (
    <Page title="Manage" padBody>
      <div className="entity management-page">
        <div className="st-typography-header">Configure Mango Pages</div>
        <div className="st-typography-body">
          {view.pageGroups.map((pageGroup) => {
            const urlValid = validateUrl(pageGroup.url);
            const titleValid = validateTitle(pageGroup.title);
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
                        error={!!titleValid}
                        onInput={(evt) =>
                          updatePageGroup({
                            ...pageGroup,
                            title: evt.target.value,
                          })
                        }
                      />
                      {titleValid && <Error>{titleValid}</Error>}
                    </FormField>
                  </div>
                  <div className="st-typography-medium">
                    URL
                    <FormField>
                      <Input
                        leftAdornment={<Link size={16} />}
                        className="management-page-input"
                        value={pageGroup.url}
                        error={!!urlValid}
                        onInput={(evt) =>
                          updatePageGroup({
                            ...pageGroup,
                            url: evt.target.value,
                          })
                        }
                      />
                      {urlValid && <Error>{urlValid}</Error>}
                    </FormField>
                  </div>
                  {renderDeletionConfirmation("page group", () =>
                    deletePageGroup(pageGroup.id)
                  )}
                </div>
                <div className="management-page-pages">
                  {pageGroup.pages.map((page) => {
                    const urlValid = validateUrl(page.url);
                    const titleValid = validateTitle(page.title);
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
                              error={!!titleValid}
                              onInput={(evt) =>
                                updatePage(
                                  {
                                    ...page,
                                    title: evt.target.value,
                                  },
                                  pageGroup.id
                                )
                              }
                            />
                            {titleValid && <Error>{titleValid}</Error>}
                          </FormField>
                        </div>
                        <div className="st-typography-medium">
                          URL
                          <FormField>
                            <Input
                              leftAdornment={<Link size={16} />}
                              className="management-page-input"
                              value={page.url}
                              error={!!urlValid}
                              onInput={(evt) =>
                                updatePage(
                                  {
                                    ...page,
                                    url: evt.target.value,
                                  },
                                  pageGroup.id
                                )
                              }
                            />
                            {urlValid && <Error>{urlValid}</Error>}
                          </FormField>
                        </div>
                        {renderDeletionConfirmation("page", () =>
                          deletePage(pageGroup.id, page.id)
                        )}
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
      </div>
    </Page>
  );
}
