import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import FeatureEffect from "@arcgis/core/layers/support/FeatureEffect";
import FeatureFilter from "@arcgis/core/layers/support/FeatureFilter";
import LabelClass from "@arcgis/core/layers/support/LabelClass";
import {SimpleRenderer} from "@arcgis/core/renderers";
import {SimpleLineSymbol, SimpleMarkerSymbol, TextSymbol} from "@arcgis/core/symbols";
// import MapView from "@arcgis/core/views/MapView";
// import WebMap from "@arcgis/core/WebMap";
import WebScene from "@arcgis/core/WebScene";
// import Map from "@arcgis/core/Map"
import SceneView from "@arcgis/core/views/SceneView";
import LineLayerAnimation from "./lib/LineLayerAnimation";
import esriConfig from "@arcgis/core/config";

// needed to access the webmap
esriConfig.apiKey = "AAPKd2c9128130334dfd8a91779f555ac729TsXtKUoXAQR3qTlSGaaiRem3SYpUdur0Ph6kQzp_DCheaZM8ZwtjJYOhJDnriX5g";

const scene = new WebScene({
  portalItem: {
    id: "b00c96feb3ad444b9b5670d815c0c4c7",
  },
});

const view = new SceneView({
  container: "viewDiv",
  map: scene,
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
      color: [255, 165, 0, 1],
      size: 8,
      style: "circle",
      outline: {
        width: 8,
        color: [255, 165, 0, 0.3],
      },
    }),
  }),
  labelingInfo: [
    new LabelClass({
      labelExpressionInfo: {expression: "$feature.name"},
      labelPlacement: "center-right",
      symbol: new TextSymbol({
        color: [255, 165, 0, 1],
        haloSize: 2,
        haloColor: [255, 255, 255, 1],
        font: {
          size: 10,
        },
      }),
    }),
  ],
});

scene.add(pois);

const filterFeatures = (filter: string) => {
  pois.featureEffect = new FeatureEffect({
    filter: new FeatureFilter({
      where: filter,
    }),
    excludedEffect: "grayscale(100%) opacity(30%)",
  });
};

const setSection = (section: string | null) => {
  if (section) {
    filterFeatures(`id = '${section}'`);
    const bookmark = scene.presentation.slides.filter(b => b.id === section).getItemAt(0);
    if (bookmark) {
      view.goTo(bookmark.viewpoint, {duration: 1500});
    }
  }
};

const tracksLayer = new GeoJSONLayer({
  url: "./data/Gull_Track_Segments.geojson",
  renderer: new SimpleRenderer({
    symbol: new SimpleLineSymbol({
      width: 3,
      color: [252, 169, 3],
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
  scene.add(animatedLayer);
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
