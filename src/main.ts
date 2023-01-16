import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import reactiveUtils from "@arcgis/core/core/reactiveUtils";
import promiseUtils from "@arcgis/core/core/promiseUtils";
import {SimpleRenderer} from "@arcgis/core/renderers";
import {SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol} from "@arcgis/core/symbols";
import MapView from "@arcgis/core/views/MapView";
import WebMap from "@arcgis/core/WebMap";
import LineLayerAnimation from "./lib/LineLayerAnimation";
import esriConfig from "@arcgis/core/config";

// needed to access the webmap
esriConfig.apiKey = "AAPKefc72b9a3df14a54a661d060aedf2ecdnOz9VfXeewb4Clxai6KbJwzrpTDZ-9U_FesGtQb3YmgKPbmd5epaIIV2Z8-hnCyk";

const map = new WebMap({
  portalItem: {
    id: "e1235a5133614a21b312485cd9845fa9",
  },
});

const view = new MapView({
  container: "viewDiv",
  map,
  ui: {
    components: [],
  },
  navigation: {
    browserTouchPanEnabled: false,
    mouseWheelZoomEnabled: false,
  },
});


const pois = new GeoJSONLayer({
  url: "./data/points.geojson",
  renderer: new SimpleRenderer({
    symbol: new SimpleMarkerSymbol({
      color: [0, 128, 100, 1],
      size: 8,
      style: "circle",
      outline: {
        width: 8,
        color: [0, 128, 100, 1],
      },
    }),
  }),
  labelingInfo: [
    new LabelClass({
      labelExpressionInfo: {expression: "$feature.name"},
      labelPlacement: "center-right",
      symbol: new TextSymbol({
        color: [0, 128, 100, 1],
        haloSize: 2,
        haloColor: [255, 255, 255, 1],
        font: {
          size: 10,
        },
      }),
    }),
  ],
});

map.add(pois);

// This block creates a set of filtered features (based on point pois) that show relevant points for each bookmark
// this logic could be used to turn on other relevant data layers as the map scrolls into view ex. breeding areas etc.
// const filterFeatures = (filter: string) => {
//   pois.featureEffect = new FeatureEffect({
//     filter: new FeatureFilter({
//       where: filter,
//     }),
//     excludedEffect: "grayscale(100%) opacity(30%)",
//   });
// };

const setSection = (section: string | null) => {
  if (section) {
    // filterFeatures(`id = '${section}'`);  // Since I'm just animating a simple line no other dynamic pois are required here when the section changes
    const bookmark = map.bookmarks.filter(b => b.name === section).getItemAt(0);
    if (bookmark) {
      view.goTo(bookmark.viewpoint, {duration: 1500});
    }
  }
};

const tracksLayer = new GeoJSONLayer({
  url: "./data/Gull_Track_Segments.geojson",
  renderer: new SimpleRenderer({
    symbol: new SimpleLineSymbol({
      width: 2,
      color: [0, 128, 100, 1],
      style: "solid",
      cap: "round",
      join: "round",
    }),
  }),
});

const tracks = {};
tracksLayer.queryFeatures({where: `1=1`, outFields: ["*"]}).then(result => {
  result.features.forEach(feature => {
    tracks[feature.attributes.id] = feature.attributes["OBJECTID"];
  });
});

const animation = new LineLayerAnimation({
  sourceLayer: tracksLayer,
});

animation.whenAnimatedLayer().then(animatedLayer => {
  map.add(animatedLayer);
});

let currentSectionId: null | string = null;
let previousSectionId: null | string = null;
const sectionsList = document.querySelectorAll("section");
const sectionsArray = Array.from(sectionsList);

function getScrollProgress(element: HTMLElement) {
  const elemRect = element.getBoundingClientRect();

  const top = elemRect.top;
  // map is covering up 30% of the window height
  const windowHeight = 0.65 * window.innerHeight || document.documentElement.clientHeight;

  const progress = Math.min(Math.max(windowHeight - top, 0.01), elemRect.height);
  return progress / elemRect.height;
}

const animateTrack = (routeObjectId: number) => {
  if (typeof routeObjectId !== "undefined" && currentSectionId) {
    const scrollProgress = getScrollProgress(document.getElementById(currentSectionId) as HTMLElement);
    animation.seek(scrollProgress, routeObjectId);
  }
};

const update = () => {
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;

  sectionsArray.forEach(section => {
    const sectionRect = section.getBoundingClientRect();
    const top = sectionRect.top;
    const percentageTop = top / windowHeight;
    if (percentageTop < 0.7) {
      currentSectionId = section.id;
    }
  });

  if (currentSectionId !== previousSectionId) {
    previousSectionId = currentSectionId;
    setSection(currentSectionId);
  } else {
    if (currentSectionId && tracks[currentSectionId]) {
      animateTrack(tracks[currentSectionId]);
    }
  }
};

window.onscroll = update;
window.onload = update;
window.onresize = update;