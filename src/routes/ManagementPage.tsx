import {
  Alert,
  AlertAction,
  AlertCancel,
  Button,
  Input,
} from "@nasa-jpl/react-stellar";
import { TrashSimple } from "@phosphor-icons/react";
import { useOutletContext } from "react-router-dom";
import Page from "../components/ui/Page";
import { Product } from "../types/api";
import { ProductPreview } from "../types/page";
import { PageGroup, View } from "../types/view";
import { createViewPage, createViewPageGroup } from "../utilities/view";

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

  const deletePageGroup = (pageGroupId: string) => {
    const newView = {
      ...view,
      pageGroups: view.pageGroups.filter((pg) => {
        return pg.id !== pageGroupId;
      }),
    };
    setView(newView);
  };

  const renderDeletionConfirmation = (item: string, onDelete: () => void) => {
    return (
      <Alert
        description={`This action cannot be undone, are you sure you want to delete this ${item}?`}
        onOpenChange={function noRefCheck() {}}
        title="Are you sure?"
        trigger={
          <Button variant="icon" size="medium">
            <TrashSimple />
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

  return (
    <Page title="Manage" padBody>
      <div
        className=""
        style={{ background: "white", padding: "16px", borderRadius: "4px" }}
      >
        <div className="st-typography-header">Configure Mango Pages</div>
        <div className="st-typography-body">
          {view.pageGroups.map((pageGroup) => {
            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    paddingTop: "16px",
                    alignItems: "center",
                  }}
                >
                  <div className="st-typography-medium">
                    Title:{" "}
                    <Input
                      value={pageGroup.title}
                      onInput={(evt) =>
                        updatePageGroup({
                          ...pageGroup,
                          title: evt.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="st-typography-medium">
                    URL:{" "}
                    <Input
                      value={pageGroup.url}
                      onInput={(evt) =>
                        updatePageGroup({
                          ...pageGroup,
                          url: evt.target.value,
                        })
                      }
                    />
                  </div>
                  {renderDeletionConfirmation("page group", () =>
                    deletePageGroup(pageGroup.id)
                  )}
                </div>
                <div
                  className="st-typography-medium"
                  style={{ padding: "8px 0" }}
                >
                  Pages
                </div>
                <div style={{ paddingLeft: "16px" }}>
                  {pageGroup.pages.map((page) => {
                    return (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        <div className="st-typography-medium">
                          Title: <Input value={page.title} />
                        </div>
                        <div className="st-typography-medium">
                          URL: <Input value={page.url} />
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
          <Button variant="tertiary" onClick={onNewPageGroupClick}>
            + New Page Group
          </Button>
        </div>
      </div>
    </Page>
  );
}
