import { catalogueDefinitions } from "@common/analytics/catalogue"
import { flowList } from "@common/analytics/flow/registry"
import { describe, expect, it } from "vitest"

import {
  ALERTS,
  buildDashboards,
  type CatalogueSnapshot,
  catalogueSnapshot,
  type Dashboard,
  dashboardName,
  dashboardTitleOf,
  insightName,
  referencedEvents,
  referencedProperties,
  specErrors,
  tileNameOf,
} from "./dashboards"
import { ev, hogql, prop, trend } from "./queries"

const catalogue: CatalogueSnapshot = catalogueSnapshot(catalogueDefinitions(), flowList())

describe("the spec against the analytics catalogue", () => {
  it("reads only events and properties the catalogue defines, with unique names", () => {
    expect(specErrors(buildDashboards(catalogue), ALERTS, catalogue)).toEqual([])
  })

  it("gives every flow a funnel and an abandonment tile", () => {
    const tiles = buildDashboards(catalogue).flatMap((d) => d.tiles.map((t) => t.name))
    for (const flow of catalogue.flows) {
      expect(tiles).toContain(`Funnel: ${flow.name}`)
      expect(tiles).toContain(`Abandoned: ${flow.name}`)
    }
  })
})

const board = (tiles: Dashboard["tiles"]): Dashboard[] => [
  { slug: "x", prefix: "X", title: "X", description: "", tiles },
]
const minimal: CatalogueSnapshot = {
  events: [{ name: "known", kind: "usage", description: "", properties: ["size"] }],
  properties: [{ name: "size", description: "", posthogType: "Numeric", isSuper: false }],
  flows: [],
}

describe("specErrors", () => {
  it("flags a tile reading an event or property the catalogue lacks", () => {
    const tiles = [
      { name: "a", description: "", query: trend({ series: [ev("gone")] }) },
      {
        name: "b",
        description: "",
        query: hogql("SELECT properties.missing FROM events WHERE event = 'known' AND {filters}"),
      },
      {
        name: "c",
        description: "",
        query: trend({ series: [ev("known", { math: "p90", mathProperty: "size" })] }),
      },
    ]
    expect(specErrors(board(tiles), [], minimal)).toEqual([
      'tile "a" reads event "gone", which the catalogue does not define',
      'tile "b" reads property "missing", which the catalogue does not define',
    ])
  })

  it("flags duplicate tile names and an alert on a tile that is not a trend", () => {
    const query = hogql("SELECT 1 FROM events WHERE event = 'known' AND {filters}")
    const errors = specErrors(
      board([
        { name: "same", description: "", query },
        { name: "same", description: "", query },
      ]),
      [
        {
          name: "alert",
          tile: "same",
          seriesIndex: 0,
          condition: "absolute_value",
          threshold: { type: "absolute" },
          interval: "daily",
        },
      ],
      minimal
    )
    expect(errors).toEqual([
      'tile name "same" is used twice',
      'alert "alert" must watch a trend tile, and "same" is not one',
    ])
  })
})

describe("specErrors on shared properties", () => {
  const shared: CatalogueSnapshot = {
    events: [
      { name: "error_shown", kind: "usage", description: "", properties: ["surface"] },
      { name: "search_performed", kind: "usage", description: "", properties: ["surface"] },
      { name: "modal_opened", kind: "usage", description: "", properties: ["modal_id"] },
    ],
    properties: [
      { name: "surface", description: "", posthogType: "String", isSuper: false },
      { name: "modal_id", description: "", posthogType: "String", isSuper: false },
      { name: "appVersion", description: "", posthogType: "String", isSuper: true },
    ],
    flows: [],
  }

  it("flags a property read on an event that does not declare it", () => {
    const tiles = [
      {
        name: "every event",
        description: "",
        query: trend({ series: [ev(null, { properties: [prop("surface", "toast")] })] }),
      },
      {
        name: "wrong event",
        description: "",
        query: trend({ series: [ev("modal_opened")], breakdown: "surface" }),
      },
      {
        name: "sql without event",
        description: "",
        query: hogql("SELECT properties.surface, count() FROM events WHERE {filters} GROUP BY 1"),
      },
    ]
    expect(specErrors(board(tiles), [], shared)).toEqual([
      'tile "every event" reads property "surface" on every event, which does not declare it',
      'tile "wrong event" reads property "surface" on "modal_opened", which does not declare it',
      'tile "sql without event" reads property "surface", which none of its events declare',
    ])
  })

  it("accepts a property next to an event that declares it, and super properties anywhere", () => {
    const tiles = [
      {
        name: "filtered",
        description: "",
        query: trend({
          series: [ev("search_performed", { properties: [prop("surface", "tokens")] })],
          breakdown: "appVersion",
        }),
      },
      {
        name: "sql",
        description: "",
        query: hogql(
          "SELECT properties.surface, properties.appVersion FROM events WHERE event = 'error_shown' AND {filters}"
        ),
      },
    ]
    expect(specErrors(board(tiles), [], shared)).toEqual([])
  })
})

describe("$exception", () => {
  it("reads the worker's exception properties, which the snapshot defines", () => {
    const names = catalogue.properties.map((p) => p.name)
    for (const name of ["exception_type", "mechanism", "handled"]) expect(names).toContain(name)
    const tiles = buildDashboards(catalogue).flatMap((d) => d.tiles)
    const read = tiles.flatMap((t) => [...referencedProperties(t.query)])
    expect(read).toEqual(expect.arrayContaining(["exception_type", "mechanism", "handled"]))
  })
})

describe("referencedEvents", () => {
  it("reads event names from series and from SQL equality and IN lists", () => {
    const sql = hogql(
      "SELECT 1 FROM events WHERE (event = 'a' OR event IN ('b', 'c')) AND {filters}"
    )
    expect([...referencedEvents(sql)].sort()).toEqual(["a", "b", "c"])
    expect([...referencedEvents(trend({ series: [ev("d"), ev(null)] }))]).toEqual(["d"])
  })
})

describe("names", () => {
  it("lets a renumbered dashboard and a moved tile match their stored objects", () => {
    const dashboards = buildDashboards(catalogue)
    const [first, second] = dashboards
    const tile = second.tiles[0]
    expect(dashboardTitleOf(dashboardName(dashboards, second).replace(/^\d+/, "17"))).toBe(
      second.title
    )
    expect(tileNameOf(insightName(dashboards, first, tile))).toBe(tile.name)
  })
})
