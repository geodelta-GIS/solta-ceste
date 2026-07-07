import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import {  transform, transformExtent } from "ol/proj";
import { useMap } from "../context/MapContext";
import "ol/ol.css";
import Popup from "./Popup";
import type { FeatureLike } from "ol/Feature";
import { TileWMS } from "ol/source";
import MapBrowserEvent from "ol/MapBrowserEvent";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Stroke from "ol/style/Stroke";
import ExportRoadsButton from "./ExportRoadsButton";
import ScaleLine from "ol/control/ScaleLine";
import { defaults as defaultControls } from "ol/control";


const MapComponent = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const { setMap } = useMap();
  const [popupData, setPopupData] = useState<{
    clickedCoordinate: Array<number>;
    id: number;
    NAZIV_CEST?:string;
    KATEG?: string;
    OZNAKA?:string;
    DUZINA_KM?:number;
    
  } | null>(null);
  const dofLayerRef = useRef<TileLayer<TileWMS> | null>(null);
  const roadsLayerRef = useRef<VectorLayer | null>(null);
  const [wmsVisible, setWmsVisible] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  

 
  const [toast, setToast] = useState<string | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<FeatureLike  | null>(null);
const selectedRoadRef = useRef<FeatureLike  | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    setMapLoading(true);
    proj4.defs(
      "EPSG:3765",
      "+proj=tmerc +lat_0=0 +lon_0=16.5 +k=0.9999 +x_0=500000 +y_0=0 +ellps=GRS80 +units=m +no_defs"
    );
    register(proj4);


    const croatiaExtent4326 = [13.0, 42.1, 19.7, 46.6];

    const croatiaExtent = transformExtent(
      croatiaExtent4326,
      "EPSG:4326",
      "EPSG:3765"
  );

    const soltaCoords = transform(
      [16.28, 43.35],
      "EPSG:4326",
      "EPSG:3765"
    );

    const roadColors: Record<string, string> = {
      I: "#d73027",
      II: "#fc8d59",
      III: "#fee08b",
      IV: "#91cf60",
      "Lunogo mar": "#1a9850",
      NC: "#4575b4",
      NI: "#984ea3",
      ostalo: "#e1e1e1",
    };

    const roadStyle = (feature: any) => {
      const kategorija = feature.get("KATEG");
      const selected =
      selectedRoadRef.current &&
      feature.get("id") === selectedRoadRef.current.get("id");

      return new Style({
        stroke: new Stroke({
          color: selected ? "#fff900" : roadColors[kategorija]?? roadColors.ostalo,
          width:selected ? 7 : 3,
        }),
      });
    };
    

    const dofLayer = new TileLayer({
      source: new TileWMS({
        url: "https://geoportal.dgu.hr/services/inspire/orthophoto_2017/ows",
        params: {
          LAYERS: "OI.OrthoImagery",
          FORMAT: "image/png",
          VERSION: "1.3.0",
        },
      }),
    });

    dofLayerRef.current = dofLayer;

    const roadsLayer = new VectorLayer({
      source: new VectorSource({
        url: import.meta.env.BASE_URL + "geojson/solta.geojson", // public/Solta_baza_cesta.geojson
        format: new GeoJSON({
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3765",
        }),
      }),
      zIndex: 10,
      style: roadStyle,
    });
    
    roadsLayerRef.current = roadsLayer;


  

    const map = new Map({
      target: mapRef.current,
      layers: [
        roadsLayer,
        dofLayer,
      ],
      controls: defaultControls().extend([
        new ScaleLine({
          units: "metric",
          bar: false,
        }),
      ]),
      view: new View({
        center: soltaCoords,
        zoom: 13,
        extent: [...croatiaExtent],
        projection: "EPSG:3765",
      }),
    });

    setMap(map);


    // --- ERROR HANDLERS ---
    const corineSource = dofLayer.getSource();


    let wmsError = false;


    const showToast = () => {
      if (wmsError ) {
        setToast(
          "Neither WMS nor cadastral layer could be loaded, please check your network connection.",
        );
      }  else {
        return;
      }

      setTimeout(() => setToast(null), 3200);
    };

    const handleCorineError = () => {
      wmsError = true;
      setWmsVisible(false);
      dofLayer.setVisible(false);
      showToast();
    };

   

    corineSource?.on("tileloaderror", handleCorineError);
    

    map.once("rendercomplete", () => {
      setMapLoading(false);
    });

    // ---POPUP CLICK ---

    const handleClick = async (evt: MapBrowserEvent) => {
      const feature = map.forEachFeatureAtPixel(
        evt.pixel,
        feature => feature
    );

    if (!feature) {
        setSelectedRoad(null);
        setPopupData(null);
        return;
    }

    setSelectedRoad(feature);

        setPopupData({
          clickedCoordinate: evt.pixel,
          id: feature.get("id"),
          NAZIV_CEST: feature.get("NAZIV_CEST"),
          KATEG: feature.get("KATEG"),
          OZNAKA: feature.get("OZNAKA"),
          DUZINA_KM: feature.get("DUZINA_KM"),
    });
};
    ;

    map.on("singleclick", handleClick);

    setMap(map);

    return () => {
      map.un("singleclick", handleClick);
      map.setTarget(undefined);
    };
  }, [setMap]);

  // ---HIGHLIGHT FEATURE---
  // useEffect(() => {
  //   highlightedFeatureRef.current = highlightedFeature;
  //   cadastralLayerRef.current?.changed();
  // }, [highlightedFeature]);

  useEffect(() => {
    selectedRoadRef.current = selectedRoad;
    roadsLayerRef.current?.changed();
}, [selectedRoad]);

  return (
    <div className=" w-screen h-screen">
      <div ref={mapRef} className="w-full h-full" />

      {/* SWITCH BUTTON */}

      <ExportRoadsButton />
     
      <div className="absolute bottom-2 right-4  rounded px-1 py-1">
  <span className="text-xs font-small text-gray-500">EPSG:3765 HTRS96/TM</span>
</div>


      <div className="absolute top-4 right-4  flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-xl border border-gray-200">
        <span className="text-sm font-medium text-gray-700">DOF 2017.</span>
        <button
          onClick={() => {
            if (dofLayerRef.current) {
              const current = dofLayerRef.current.getVisible();
              dofLayerRef.current.setVisible(!current);
              setWmsVisible(!current);
              setPopupData(null);
              setSelectedRoad(null);
            }
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
            wmsVisible ? "bg-blue-400" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              wmsVisible ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      
      <div className="absolute top-20 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
  <h3 className="text-sm font-semibold text-gray-700 mb-3">
    Kategorija cesta
  </h3>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#d73027" }} />
    <span className="text-sm">I</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#fc8d59" }} />
    <span className="text-sm">II</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#fee08b" }} />
    <span className="text-sm">III</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#91cf60" }} />
    <span className="text-sm">IV</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#1a9850" }} />
    <span className="text-sm">Lungo mar</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#4575b4" }} />
    <span className="text-sm">NC</span>
  </div>

  <div className="flex items-center gap-2 mb-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#984ea3" }} />
    <span className="text-sm">NI</span>
  </div>

  <div className="flex items-center gap-2">
    <div className="w-4 h-1 rounded" style={{ backgroundColor: "#e1e1e1" }} />
    <span className="text-sm">Ostalo</span>
  </div>
</div>
      {/* LOADING OVERLAY */}
      {mapLoading && (
        <div className="absolute inset-0  flex items-center justify-center bg-white bg-opacity-90 pointer-events-none">
          <div className="animate-spin h-20 w-20 border-4 border-blue-400 border-t-transparent rounded-full" />
        </div>
      )}
      {/* TOAST ERROR */}
      {toast && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-700 p-4 rounded shadow  border border-red-300">
          {toast}
        </div>
      )}

      {/* POPUP */}
      {popupData && (
        <Popup
          data={popupData}
          onClose={() => {
            setPopupData(null);
            setSelectedRoad(null);
          }}
        />
      )}
    </div>
  );
};

export default MapComponent;
