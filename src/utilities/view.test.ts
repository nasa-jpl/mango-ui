import { expect, test } from "vitest";
import {
  generateTestChartLayer,
  generateTestDataEntry,
} from "../test-utils/factories/view";
import {
  ChartLayer,
  DataTransform,
  Entity,
  Section,
  TimeSeriesPoint,
} from "../types/view";
import {
  applyLayerTransform,
  applyLayerTransforms,
  createDataLayer,
  createEntity,
  createView,
  createViewPage,
  createViewPageGroup,
  duplicateEntity,
  duplicateSection,
  findMatchingPoint,
  formatYValue,
  isChartEntity,
  isChartLayerEvent,
  isChartLayerLine,
  isDownlinkDashboardEntity,
  isMapEntity,
  isTableEntity,
  isTextEntity,
  isTimelineRowEntity,
  removeEntityFromSection,
  replaceEntityInSection,
} from "./view";

const chartLayer1 = generateTestChartLayer();
const chartLayer2 = generateTestChartLayer();
const chartLayer3 = generateTestChartLayer();
const dummyPoint = generateTestDataEntry();
const testData = [
  {
    layer: chartLayer1,
    pointsByField: {
      field1: [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
  {
    layer: chartLayer2,
    pointsByField: {
      field1: [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 3,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 4,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 5,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
  {
    layer: chartLayer3,
    pointsByField: {
      field1: [
        {
          x: "2031-01-01T00:00:00.000Z",
          y: 6,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2031-01-02T00:00:00.000Z",
          y: 7,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2031-01-03T00:00:00.000Z",
          y: 8,
          raw: dummyPoint,
          selected: false,
        },
      ],
    },
  },
];

test("applyLayerTransform", () => {
  const point: TimeSeriesPoint = {
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: generateTestDataEntry(),
    selected: false,
  };
  expect(
    applyLayerTransform(
      0,
      point,
      { add: 1, type: "self", axis: "y" },
      undefined,
      testData,
    ),
  ).toBe(1);
  expect(
    applyLayerTransform(
      new Date("2030-01-01T00:00:00.000Z").getTime(),
      point,
      { add: 500, type: "self", axis: "y" },
      undefined,
      testData,
    ),
  ).toBe(new Date("2030-01-01T00:00:00.000Z").getTime() + 500);
  expect(
    applyLayerTransform(
      0,
      point,
      { add: 1, subtract: 2, type: "self", axis: "y" },
      undefined,
      testData,
    ),
  ).toBe(-1);
  expect(
    applyLayerTransform(
      0,
      point,
      { add: true, type: "derived", axis: "y", layerId: chartLayer2.id },
      "field1",
      testData,
      0,
    ),
  ).toBe(3);
});

test("applyLayerTransforms", () => {
  const point: TimeSeriesPoint = {
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: generateTestDataEntry(),
    selected: false,
  };
  expect(applyLayerTransforms(point, chartLayer1, testData, 0)).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      { ...chartLayer1, transforms: [] },
      testData,
      0,
    ),
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      { ...chartLayer1, transforms: [{ type: "self", add: 1, axis: "y" }] },
      testData,
      0,
    ),
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 1,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      {
        ...chartLayer1,
        fields: ["field1"],
        transforms: [
          { type: "self", add: 1, axis: "y" },
          {
            type: "derived",
            layerId: chartLayer2.id,
            axis: "y",
            multiply: true,
          },
        ],
      },
      testData,
      0,
    ),
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 3,
    raw: point.raw,
    selected: point.selected,
  });
  expect(
    applyLayerTransforms(
      point,
      {
        ...chartLayer1,
        fields: ["field1"],
        transforms: [
          { type: "self", add: 1, axis: "y" },
          // Case where chartLayer1 is not time aligned with chartLayer3
          {
            type: "derived",
            layerId: chartLayer3.id,
            axis: "y",
            multiply: true,
          },
        ],
      },
      testData,
      0,
    ),
  ).to.deep.eq(null);
});

test("formatYValue", () => {
  expect(formatYValue("10")).toEqual("10");
  expect(formatYValue(0)).toEqual("0");
  expect(formatYValue(10)).toEqual("10");
  expect(formatYValue(100000)).toEqual("1e+5");
  expect(formatYValue(0.00005000009)).toEqual("5.000009e-5");
  expect(formatYValue(0.0000480388100419)).toEqual("4.803881e-5");
  expect(formatYValue(199123812391823)).toEqual("1.991238e+14");
  expect(formatYValue(null)).toEqual("");

  // Non-numeric strings must pass through verbatim (a numeric string like "10"
  // would coerce identically if the string branch were skipped, hiding the bug).
  expect(formatYValue("hello")).toEqual("hello");
  expect(formatYValue("N/A")).toEqual("N/A");

  // Boundary: exactly at the small/large thresholds uses fixed-significant (~g),
  // not scientific (~e). One tick either side of the boundary distinguishes
  // `<` from `<=` and `>` from `>=`.
  expect(formatYValue(0.0001)).toEqual("0.0001");
  expect(formatYValue(0.00009)).toEqual("9e-5");
  expect(formatYValue(9999)).toEqual("9999");
  expect(formatYValue(10000)).toEqual("1e+4");

  // In-range, high-precision value: ~g trims to 6 significant figures. An empty
  // format specifier would emit the full-precision value instead.
  expect(formatYValue(123.456789)).toEqual("123.457");
});

test("findMatchingPoint", () => {
  expect(findMatchingPoint([], 0, "2030-01-01T00:00:00.000Z")).to.eq(null);
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-01T00:00:00.000Z",
    ),
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-01T00:00:00.000Z",
    ),
  ).to.deep.eq({
    x: "2030-01-01T00:00:00.000Z",
    y: 0,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2030-01-02T00:00:00.000Z",
    ),
  ).to.deep.eq({
    x: "2030-01-02T00:00:00.000Z",
    y: 1,
    raw: dummyPoint,
    selected: false,
  });
  expect(
    findMatchingPoint(
      [
        {
          x: "2030-01-01T00:00:00.000Z",
          y: 0,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-02T00:00:00.000Z",
          y: 1,
          raw: dummyPoint,
          selected: false,
        },
        {
          x: "2030-01-03T00:00:00.000Z",
          y: 2,
          raw: dummyPoint,
          selected: false,
        },
      ],
      0,
      "2040-01-02T00:00:00.000Z",
    ),
  ).to.deep.eq(null);
});

const pt = (x: string, y: number): TimeSeriesPoint => ({
  x,
  y,
  raw: dummyPoint,
  selected: false,
});

test("findMatchingPoint scans backwards from the start index", () => {
  const points = [
    pt("2030-01-01T00:00:00.000Z", 0),
    pt("2030-01-02T00:00:00.000Z", 1),
    pt("2030-01-03T00:00:00.000Z", 2),
  ];
  // Target is at index 0 but we start scanning at index 2, so it can only be
  // found by walking left (points[index - step]).
  expect(findMatchingPoint(points, 2, "2030-01-01T00:00:00.000Z")).to.deep.eq(
    pt("2030-01-01T00:00:00.000Z", 0),
  );
});

test("findMatchingPoint uses an empty-string default dateString when none is provided", () => {
  // Called without a dateString (defaults to ""), only a point whose x === "" matches.
  expect(findMatchingPoint([pt("", 5)], 0)).to.deep.eq(pt("", 5));
});

test("applyLayerTransform self multiply and divide", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 0);
  expect(
    applyLayerTransform(
      4,
      point,
      { type: "self", axis: "y", multiply: 2 },
      undefined,
      testData,
    ),
  ).toBe(8);
  expect(
    applyLayerTransform(
      8,
      point,
      { type: "self", axis: "y", divide: 2 },
      undefined,
      testData,
    ),
  ).toBe(4);
});

test("applyLayerTransform derived subtract and divide", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 0);
  // Matching point in chartLayer2/field1 at index 0 has y === 3.
  expect(
    applyLayerTransform(
      10,
      point,
      { type: "derived", axis: "y", subtract: true, layerId: chartLayer2.id },
      "field1",
      testData,
      0,
    ),
  ).toBe(7);
  expect(
    applyLayerTransform(
      9,
      point,
      { type: "derived", axis: "y", divide: true, layerId: chartLayer2.id },
      "field1",
      testData,
      0,
    ),
  ).toBe(3);
});

test("applyLayerTransform derived returns value unchanged when the referenced layer is missing", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 0);
  // No layer matches this layerId, so the guarded block must be skipped and the
  // original value returned untouched.
  expect(
    applyLayerTransform(
      42,
      point,
      { type: "derived", axis: "y", add: true, layerId: "does-not-exist" },
      "field1",
      testData,
      0,
    ),
  ).toBe(42);
});

test("applyLayerTransform ignores transforms that are neither self nor derived", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 0);
  const rogue = {
    type: "bogus",
    axis: "y",
    add: true,
    layerId: chartLayer2.id,
  } as unknown as DataTransform;
  // Even with a matching layer/field available, an unknown transform type must
  // not enter the derived branch, so the value is returned unchanged.
  expect(applyLayerTransform(5, point, rogue, "field1", testData, 0)).toBe(5);
});

test("applyLayerTransforms applies an x-axis transform without touching y", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 7);
  const layer: ChartLayer = {
    ...chartLayer1,
    fields: ["field1"],
    transforms: [{ type: "self", axis: "x", add: 86_400_000 }],
  };
  const result = applyLayerTransforms(point, layer, testData, 0);
  expect(result).not.toBeNull();
  expect(result?.x).toBe("2030-01-02T00:00:00.000Z");
  expect(result?.y).toBe(7);
});

test("applyLayerTransforms returns null when an x-axis derived point is unaligned", () => {
  const point = pt("2030-01-01T00:00:00.000Z", 0);
  const layer: ChartLayer = {
    ...chartLayer1,
    fields: ["field1"],
    transforms: [
      {
        type: "derived",
        axis: "x",
        add: true,
        layerId: chartLayer3.id,
      },
    ],
  };
  expect(applyLayerTransforms(point, layer, testData, 0)).toBeNull();
});

test("entity type guards discriminate on the type field", () => {
  const chart = { type: "chart" } as Entity;
  const map = { type: "map" } as Entity;
  const table = { type: "table" } as Entity;
  const downlink = { type: "downlink-dashboard" } as Entity;
  const timelineRow = { type: "timeline-row" } as Entity;
  const text = { type: "text" } as Entity;

  expect(isChartEntity(chart)).toBe(true);
  expect(isChartEntity(map)).toBe(false);
  expect(isMapEntity(map)).toBe(true);
  expect(isMapEntity(chart)).toBe(false);
  expect(isTableEntity(table)).toBe(true);
  expect(isTableEntity(chart)).toBe(false);
  expect(isDownlinkDashboardEntity(downlink)).toBe(true);
  expect(isDownlinkDashboardEntity(chart)).toBe(false);
  expect(isTimelineRowEntity(timelineRow)).toBe(true);
  expect(isTimelineRowEntity(chart)).toBe(false);
  expect(isTextEntity(text)).toBe(true);
  expect(isTextEntity(chart)).toBe(false);
});

test("chart layer type guards discriminate on the type field", () => {
  const line = { type: "line" } as ChartLayer;
  const event = { type: "event" } as ChartLayer;
  expect(isChartLayerLine(line)).toBe(true);
  expect(isChartLayerLine(event)).toBe(false);
  expect(isChartLayerEvent(event)).toBe(true);
  expect(isChartLayerEvent(line)).toBe(false);
});

test("createView produces a versioned, empty default view", () => {
  const view = createView();
  expect(view.version).toBe(1);
  expect(view.pageGroups).toEqual([]);
  expect(view.config?.sidebarWidth).toBe(200);
  expect(view.config?.dateRangeBounds).toEqual({
    start: "2010-12-01T00:00:00Z",
    end: "2050-12-01T00:00:00Z",
  });
  expect(view.home.sections).toEqual([]);
  expect(view.home.dateFormat).toBe("long");
  // A freshly-created view must survive a JSON serialization round-trip intact.
  expect(JSON.parse(JSON.stringify(view))).toEqual(view);
});

test("createViewPage applies defaults and honors overrides", () => {
  const page = createViewPage({});
  expect(page.dateFormat).toBe("long");
  expect(page.sections).toEqual([]);
  expect(page.title).toBe("");
  expect(page.url).toBe("");
  expect(page.id).toBeTruthy();

  const custom = createViewPage({ title: "Overview", url: "overview" });
  expect(custom.title).toBe("Overview");
  expect(custom.url).toBe("overview");
});

test("createViewPageGroup applies defaults and honors overrides", () => {
  const group = createViewPageGroup({});
  expect(group.pages).toEqual([]);
  expect(group.title).toBe("");
  expect(group.url).toBe("");
  expect(group.id).toBeTruthy();

  const custom = createViewPageGroup({ title: "Group A" });
  expect(custom.title).toBe("Group A");
});

test("createEntity defaults to a chart and only tables get columns/layers", () => {
  const entity = createEntity({});
  expect(entity.type).toBe("chart");
  expect(entity.title).toBe("New Entity");
  expect(entity.syncWithPageDateRange).toBe(true);
  expect(entity.id).toBeTruthy();
  expect("columns" in entity).toBe(false);

  const table = createEntity({ type: "table" }) as Entity & {
    columns: unknown[];
    layers: unknown[];
  };
  expect(table.columns).toEqual([]);
  expect(table.layers).toEqual([]);

  const map = createEntity({ type: "map" });
  expect("columns" in map).toBe(false);
});

test("createDataLayer applies defaults and honors overrides", () => {
  const layer = createDataLayer({});
  expect(layer).toMatchObject({
    dataset: "",
    endTime: "",
    fields: [],
    instrument: "",
    mission: "",
    startTime: "",
    version: "",
  });
  expect(layer.id).toBeTruthy();

  const custom = createDataLayer({ mission: "GRACE", fields: ["a", "b"] });
  expect(custom.mission).toBe("GRACE");
  expect(custom.fields).toEqual(["a", "b"]);
});

test("duplicateEntity appends a clone with a new id and layout, leaving the source untouched", () => {
  const original = createEntity({ title: "Chart A" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [original],
    layout: [{ i: original.id, w: 4, h: 2, x: 0, y: 0 }],
  };

  const result = duplicateEntity(original, section);

  expect(result.entities).toHaveLength(2);
  const clone = result.entities[1];
  expect(clone.id).not.toBe(original.id);
  expect(clone.title).toBe(original.title);
  expect(result.layout).toHaveLength(2);
  expect(result.layout[1]).toEqual({ i: clone.id, w: 4, h: 2, x: 0, y: 0 });

  // Source section must not be mutated.
  expect(section.entities).toHaveLength(1);
  expect(section.layout).toHaveLength(1);
});

test("removeEntityFromSection drops the entity and its layout entry by index, leaving others", () => {
  const a = createEntity({ title: "A" });
  const b = createEntity({ title: "B" });
  const c = createEntity({ title: "C" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [a, b, c],
    layout: [
      { i: "L0", w: 1, h: 1, x: 0, y: 0 },
      { i: "L1", w: 1, h: 1, x: 1, y: 0 },
      { i: "L2", w: 1, h: 1, x: 2, y: 0 },
    ],
  };

  const result = removeEntityFromSection(section, b.id);

  // Entity b removed, a and c kept in order.
  expect(result.entities.map((e) => e.id)).toEqual([a.id, c.id]);
  // Layout entry at b's index (1) is removed.
  expect(result.layout.map((l) => l.i)).toEqual(["L0", "L2"]);

  // Source section is not mutated.
  expect(section.entities).toHaveLength(3);
  expect(section.layout).toHaveLength(3);
});

test("removeEntityFromSection returns unchanged entities and layout when the id is absent", () => {
  const a = createEntity({ title: "A" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [a],
    layout: [{ i: "L0", w: 1, h: 1, x: 0, y: 0 }],
  };

  const result = removeEntityFromSection(section, "missing-id");

  expect(result.entities.map((e) => e.id)).toEqual([a.id]);
  expect(result.layout.map((l) => l.i)).toEqual(["L0"]);
});

test("replaceEntityInSection swaps the matching entity and leaves the rest untouched", () => {
  const a = createEntity({ title: "A" });
  const b = createEntity({ title: "B" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [a, b],
    layout: [],
  };
  const updatedB = { ...b, title: "B updated" };

  const result = replaceEntityInSection(section, updatedB);

  expect(result.entities[0]).toBe(a);
  expect(result.entities[1]).toBe(updatedB);
  expect(result.entities[1].title).toBe("B updated");
});

test("replaceEntityInSection leaves entities unchanged when no id matches", () => {
  const a = createEntity({ title: "A" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [a],
    layout: [],
  };
  const stranger = createEntity({ title: "Z" });

  const result = replaceEntityInSection(section, stranger);

  expect(result.entities).toEqual([a]);
});

test("duplicateSection deep-clones with fresh ids and remaps layout entries", () => {
  const entityA = createEntity({ title: "A" });
  const entityB = createEntity({ title: "B" });
  const section: Section = {
    id: "section-1",
    title: "Section",
    entities: [entityA, entityB],
    layout: [
      { i: entityA.id, w: 4, h: 2, x: 0, y: 0 },
      { i: entityB.id, w: 4, h: 2, x: 4, y: 0 },
    ],
  };

  const result = duplicateSection(section);

  expect(result.id).not.toBe(section.id);
  expect(result.entities).toHaveLength(2);
  // Every entity gets a new id...
  expect(result.entities[0].id).not.toBe(entityA.id);
  expect(result.entities[1].id).not.toBe(entityB.id);
  // ...and the layout `i` references are remapped to the new ids in order.
  expect(result.layout[0].i).toBe(result.entities[0].id);
  expect(result.layout[1].i).toBe(result.entities[1].id);

  // Source section must not be mutated.
  expect(section.id).toBe("section-1");
  expect(section.entities[0].id).toBe(entityA.id);
  expect(section.layout[0].i).toBe(entityA.id);
});
