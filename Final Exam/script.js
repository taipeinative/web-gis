const addOutlineFromCoordinates = (pointA, pointB, pointC, pointD, target) => {
    const feature = new ol.Feature(
        new ol.geom.Polygon([[
            pointA,
            pointB,
            pointC,
            pointD
        ]]).transform('EPSG:3826','EPSG:3857')
    );
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [feature]
        })
    });
    const map = new ol.Map({
        layers: [
            layer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([121.5385, 25.015]),
            zoom: 18
        }),
        target: target
    });
}

const addOSMSource = async (target) => {
    const query = await fetch('https://www.overpass-api.de/api/interpreter?', {
        body: '[out:json];node(25.01,121.53,25.02,121.54)["shop"="convenience"];out;',
        headers: {'Accept':'application/json'},
        method: 'POST'
    });
    const queryArray = JSON.parse(await query.text()).elements;
    const features = queryArray.map(q => {
        return (
            new ol.Feature(
                new ol.geom.Point(
                    ol.proj.fromLonLat([q.lon, q.lat])
                )
            )
        );
    });
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: features
        })
    });
    const map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            layer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([121.5385, 25.015]),
            zoom: 15
        }),
        target: target
    });
}

const addOpenDataGeoJSON = target => {
    const layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            format: new ol.format.GeoJSON(),
            url: './dummy.geojson'
        })
    });
    const map = new ol.Map({
        layers: [layer],
        view: new ol.View({
            center: ol.proj.fromLonLat([121.5385, 25.018]),
            zoom: 15
        }),
        target: target
    });
}

window.addEventListener('load', () => {
    proj4.defs(
        'EPSG:3826',
        '+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
    );
    ol.proj.proj4.register(proj4);

    addOutlineFromCoordinates(
        [304337.836, 2767565.823],
        [304353.484, 2767545.289],
        [304325.674, 2767526.467],
        [304311.378, 2767547.410],
        'map1'
    );
    addOSMSource('map2');
    addOpenDataGeoJSON('map3');
});