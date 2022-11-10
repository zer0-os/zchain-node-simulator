import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
//import MapboxglSpiderifier from "mapboxgl-spiderifier";
import greenImage from "../assets/mapbox-marker-icon-20px-green.png";
import grayImage from "../assets/mapbox-marker-icon-20px-red.png";
import blueImage from "../assets/mapbox-marker-icon-20px-blue.png";
//import _ from 'lodash';

mapboxgl.accessToken =
  "pk.eyJ1IjoicmF0aWsyMSIsImEiOiJjbGFiZmF5YXMwNDQ2M25wMDQ3dWNlMTJyIn0.iQMyX4lbiYZF6KAoZtSQug";

const Map = () => {
  const mapContainerRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [storageTotal, setStorageTotal] = useState(0);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [avgNodeStorage, setAvgNodeStorage] = useState(0);
  const [nodesTotal, setNodesTotal] = useState(0);
  const [onlineNodes, setOnlineNodes] = useState(0);
  const [offlineNodes, setOfflineNodes] = useState(0);
  const [inActiveNodes, setInActiveNodes] = useState(0);

  function getNodeColor(record) {
    switch (record.status) {
      case "online":
        return "green_marker";
      case "offline":
        return "blue_marker";
      default:
        return "gray_marker";
    }
  }

  function getGeoPointsFeatures() {
    const features = [];
    if (records.length) {
      for (const record of records) {
        //const latitude = record.geoLocation.ll[0];
        //const longitude = record.geoLocation.ll[1];
        const latitude = record.geoLocation.lat;
        const longitude = record.geoLocation.lon;

        features.push({
          type: "Feature",
          geometry: {
            coordinates: [longitude, latitude],
            type: "Point",
          },
          properties: {
            description: `<div> 
            <li>TimeStamp : ${new Date(record.timestamp * 1000)} </li>
            <li>Status : ${record.status}</li>
            <li>OS: ${record.os} </li>
            <li style="word-break: break-all;">PeerID:${record.peerId}</li>
            </div>`,
            icon: getNodeColor(record),
            status: record.status
          },
        });
      }
    }

    console.log("features ", features);
    return features;
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      console.log("refreshing");
      await getRecords();
    }, 1 * 60 * 1000); // every min
    return function stopTimer() {
      clearInterval(timer);
    };
  }, []);

  async function getRecords() {
    const response = await fetch(`/networks`);
    if (!response.ok) {
      const message = `An error occurred while fetching nodes: ${response.statusText}`;
      window.alert(message);
      return;
    }
    const records = await response.json();

    // console.log("RRRRRR ", records)
    const rec = [];
    const freq = [];
    for (let i = 0; i < records.length; i++) {
      if (freq[i] === 1) { continue; }

      const lat = records[i].geoLocation.lat;
      const lon = records[i].geoLocation.lon;

      const recordsWithSameLoc = [];
      recordsWithSameLoc.push(records[i]);
      for (let j = 0; j < records.length; j++) {
        if (i === j) { continue; }

        if (records[j].geoLocation.lat === lat && records[j].geoLocation.lon === lon) {
          recordsWithSameLoc.push(records[j]);
          freq[j] = 1;
        }
      }

      if (recordsWithSameLoc.length > 0) {
        rec.push(recordsWithSameLoc[0]); // push the first one
      } 

      for (let k = 1; k < recordsWithSameLoc.length; k++) {
        rec.push({
          ...recordsWithSameLoc[k],
          geoLocation: {
            ...recordsWithSameLoc[k].geoLocation,
            lat: Number(recordsWithSameLoc[k - 1].geoLocation.lat + 0.2).toFixed(4),
            lon: Number(recordsWithSameLoc[k - 1].geoLocation.lon + 0.2).toFixed(4),
          }
        });
      }
    }


    let messageTot = 0;
    let storageTot = 0;
    let totalNodes = 0;
    let online = 0;
    let offline = 0;
    let inactive = 0;


    setRecords(rec);
    for (const record of rec) {
      console.log(record.status);
      //console.log("lat ", record.geoLocation.lat , "  lon: ", record.geoLocation.lon);
      messageTot += record.messages?.length ?? 0;
      storageTot += record.storage ?? 0;
      totalNodes += 1;
      if (record.status === "offline") {
        offline++;
      } else if (record.status === "inactive") {
        inactive++;
      } else {
        online++;
      }
    }
    setMessagesTotal(messageTot);
    setStorageTotal(storageTot);
    setAvgNodeStorage(storageTot / totalNodes);
    setNodesTotal(totalNodes);
    setOnlineNodes(online);
    setOfflineNodes(offline);
    setInActiveNodes(inactive);
    console.log(records);
  }

  // Initialize map when component mounts
  useEffect(() => {
    getRecords();

    if (records.length) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v10",
        center: [12.550343, 55.665957],
        zoom: 1,
      });
      // let spiderifier = new MapboxglSpiderifier(map, {
      //   customPin: true
      // }),
      // SPIDERFY_FROM_ZOOM = 10;
      map.on("load", () => {
        Promise.all(
          [
            {
              url: greenImage,
              id: "green_marker",
            },
            {
              url: grayImage,
              id: "gray_marker",
            },
            {
              url: blueImage,
              id: "blue_marker",
            },
          ].map(
            (img) =>
              new Promise((resolve, reject) => {
                map.loadImage(img.url, function (error, res) {
                  if (error) reject(error);
                  map.addImage(img.id, res);
                  resolve();
                });
              })
          )
        ).then(() => {
          // Add a new source from our GeoJSON data and
          // set the 'cluster' option to true. GL-JS will
          // add the point_count property to your source data.
          map.addSource("networks", {
            type: "geojson",
            // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
            // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
            data: {
              type: "FeatureCollection",
              features: getGeoPointsFeatures(),
            },
            cluster: true,
            clusterMaxZoom: 5, // Max zoom to cluster points on
            clusterRadius: 25, // Radius of each cluster when clustering points (defaults to 50)    
          });

          map.addLayer({
            id: "clusters",
            type: "circle",
            source: "networks",
            filter: ["has", "point_count"],
            paint: {
              // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
              // with three steps to implement three types of circles:
              //   * Blue, 20px circles when point count is less than 100
              //   * Yellow, 30px circles when point count is between 100 and 750
              //   * Pink, 40px circles when point count is greater than or equal to 750
              "circle-color": [
                'match',
                ['get', 'status'],
                'online',
                '#FBB03B',
                'offline',
                '#FBB03B',
                'inactive',
                '#FBB03B',
                '#f28cb1'
              ],
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                100,
                30,
                750,
                40,
              ],
            },
          });


          map.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "networks",
            filter: ["has", "point_count"],
            layout: {
              "text-field": "{point_count_abbreviated}",
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
              "text-size": 12,
            },
          });

          map.addLayer({
            id: "unclustered-point",
            type: "symbol",
            layout: {
              "icon-image": ["get", "icon"],
              "icon-size": 1,
              "icon-allow-overlap": true
            },
            source: "networks",
            filter: ["!", ["has", "point_count"]],
          });

          // inspect a cluster on click
          map.on("click", "clusters", (e) => {
            const features = map.queryRenderedFeatures(e.point, {
              layers: ["clusters"],
            });
            const clusterId = features[0].properties.cluster_id;

            // spiderifier.unspiderfy();

            // if (!features.length) {
            //   return;
            // } else if (map.getZoom() < SPIDERFY_FROM_ZOOM) {
            //   map.easeTo({center: features[0].geometry.coordinates, zoom: map.getZoom() + 2});
            // } else {
            //   map.getSource('networks').getClusterLeaves(
            //     clusterId,
            //     100,
            //     0,
            //     function(err, leafFeatures){
            //       if (err) {
            //         return console.error('error while getting leaves of a cluster', err);
            //       }
            //       var markers = _.map(leafFeatures, function(leafFeature){
            //         return leafFeature.properties;
            //       });
            //       spiderifier.spiderfy(features[0].geometry.coordinates, markers);
            //     }
            //   );
            // }

            map
              .getSource("networks")
              .getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;

                map.easeTo({
                  center: features[0].geometry.coordinates,
                  zoom: zoom,
                });
              });
          });
        });

        // When a click event occurs on a feature in
        // the unclustered-point layer, open a popup at
        // the location of the feature, with
        // description HTML from its properties.
        map.on("click", "unclustered-point", (e) => {
          const coordinates = e.features[0].geometry.coordinates.slice();
          const description = e.features[0].properties.description;
          // Ensure that if the map is zoomed out such that
          // multiple copies of the feature are visible, the
          // popup appears over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(description)
            .addTo(map);
        });

        map.on("mouseenter", "clusters", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "clusters", () => {
          map.getCanvas().style.cursor = "";
        });

        // Clean up on unmount
        return () => map.remove();
      });
    }
  }, [records.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="sidebarStyle">
        <div>Total Storage of Network: {storageTotal.toFixed(3)}</div>
        <div>Total number of messages : {messagesTotal}</div>
        <div>Average Size of Each Node : {avgNodeStorage.toFixed(3)}</div>
        <div>Total Nodes:{nodesTotal} </div>
        <div>Online Nodes:{onlineNodes} </div>
        <div>Offline Nodes:{offlineNodes}</div>
        <div>InActive Nodes:{inActiveNodes}</div>
      </div>
      <div id="map" className="map-container dark" ref={mapContainerRef} />
    </div>
  );
};

export default Map;
