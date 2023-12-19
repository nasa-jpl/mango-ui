import { Button } from "@nasa-jpl/react-stellar";
import { Page as PageType, SectionEntity } from "../../types/view";
import Entity from "./Entity";
import "./Page.css";

export declare type PageProps = {
  page?: PageType;
  onPageChange: (page: PageType) => void;
};

export const Page = ({ page, onPageChange }: PageProps) => {
  if (!page) {
    return;
  }
  return (
    <div className="page">
      <div className="page-top-content">
        <div className="page-title st-typography-displayBody">{page.title}</div>
        <Button
          onClick={() => {
            const newPage: PageType = {
              ...page,
              entities: [
                ...page.entities,
                {
                  title: "New Entity",
                  id: Math.random().toString(),
                  type: "section",
                  entities: [],
                } as SectionEntity,
              ],
            };
            onPageChange(newPage);
          }}
        >
          Add section
        </Button>
      </div>
      <div className="page-body">
        {page.entities.map((entity) => (
          <Entity entity={entity} key={entity.id} />
        ))}
      </div>
    </div>
  );
};

export default Page;
