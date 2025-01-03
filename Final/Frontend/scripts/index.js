/**
 * 管理圖表的類別。
 */
class ChartService {
    
    /**
     * @var {Array<object>} cacheData 臨時儲存資料的欄位。
     */
    cacheData = []; 
    
    /**
     * @var {object} chart 儲存圖表的欄位。
     */
    chart = null;

    /**
     * @var {string} ref 儲存參考對象名稱的欄位。
     */
    ref = 'chart';

    /**
     * 建立圖表的建構函式。
     * @param {string} ref 圖表將置入的對象名稱。
     */
    constructor(ref) {
        this.ref = ref;
    }

    /**
     * 在選定的對象上繪製長條圖。
     * @param {string} city 指定的縣市。
     * @param {string} year 指定的年份。
     */
    async draw(city, year) {
        const refElement = document.getElementById(this.ref);
        const tooltipElement = d3.select('#tooltip');

        if (this.cacheData.length == 0) {
            this.cacheData = await Fetch.features('camera');
        }

        // 檢查參考對象是否存在。
        if (!refElement) {
            throw new Error('Invalid reference');
        }

        // 移除既有圖表。
        refElement.innerHTML = '';

        const data = this.extractData(city, year);
        const margin = { top: 15, right: 10, bottom: 15, left: 75};
        const refHeight = 450 - margin.top - margin.bottom;
        const refWidth = 1000 - margin.left - margin.right;

        // 基本設定
        this.chart = d3.select(`#${this.ref}`)
            .append('svg')
            .attr('width', refWidth + margin.left + margin.right)
            .attr('height', refHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // 軸線設定
        const x = d3.scaleBand()
            .domain(data.map(d => d.address))
            .range([0, refWidth])
            .padding(0.1);
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .nice()
            .range([refHeight, 0]);
        this.chart.append('g')
            .attr('transform', `translate(0, ${refHeight})`)
            .call(d3.axisBottom(x).tickFormat(() => ''));
        this.chart.append('g')
            .call(d3.axisLeft(y));

        // 長條設定
        this.chart.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.address))
            .attr('y', d => d.value >= 0 ? y(d.value) : y(0))
            .attr('width', x.bandwidth())
            .attr('height',d => Math.abs(y(0) - y(d.value)))
            .attr('fill', 'steelblue')
            .on('mouseover', (e, d) => {
                tooltipElement.style('opacity', 1)
                    .html(`位置：${d.address}<br />金額：${new Intl.NumberFormat('zh-TW').format(d.value)}`)
                    .style('left', `${e.pageX + 5}px`)
                    .style('top', `${e.pageY - 28}px`);
            })
            .on('mousemove', e => {
                tooltipElement.style('left', `${e.pageX + 5}px`)
                    .style('top', `${e.pageY - 28}px`);
            })
            .on('mouseout', () => tooltipElement.style('opacity', 0));
    }

    /**
     * 從儲存的資料中擷取需要的年份。
     * @param {string} city 資料的縣市。
     * @param {string} year 資料的年份。
     * @param {boolean} forDownload 是否用於資料下載？可選參數。
     */
    extractData(city, year, forDownload = false) {
        /**
         * 根據名稱檢查測速照相是否位於高快速公路上。
         * @param {string} address 測速照相的名稱。
         * @returns {boolean} 測速照相是否在高快速公路上。
         */
        const isExpwyOrFwy = address => {
            return ['國道', '台61線', '台82線', '台84線', '台86線', '臺61線', '臺82線', '臺84線', '臺86線', '快速道路'].some(substring => address.includes(substring));
        }

        let features = this.cacheData.features.map((feature, index) => {
            // 高快速公路超速10～20km/h = NT$3000, 超速20～40km/h = NT$3500
            // 一般道路汽車超速10～20km/h = NT$1600, 超速20～40km/h = NT$1800
            // 一般道路機車超速10～20km/h = NT$1200, 超速20～40km/h = NT$1400
            // 根據警政統計通報，超速40km/h以下的違規率汽車：機車約為7:3
            const multiplier = isExpwyOrFwy(feature.properties.Address) ? 3250 : 1580;

            if (forDownload) {
                return {
                    type: 'Feature',
                    properties: {
                        CityName: feature.properties.CityName,
                        RegionName: feature.properties.RegionName,
                        Address: feature.properties.Address,
                        Direction: feature.properties.Direction,
                        Limit: feature.properties.Limit,
                        Type: feature.properties.Type,
                        Value: (year == 'All' ? Object.values(feature.properties.Case).reduce((total, value) => total + value, 0) : feature.properties.Case[year]) * multiplier
                    },
                    geometry: feature.geometry
                };
            } else {
                return {
                    address: feature.properties.Address,
                    city: feature.properties.CityName,
                    coordinate: feature.geometry.coordinates,
                    value: (year == 'All' ? Object.values(feature.properties.Case).reduce((total, value) => total + value, 0) : feature.properties.Case[year]) * multiplier
                };
            }
        });

        if (forDownload) {
            features = features.filter(val => {
                return (city == 'All' ? true : val.properties.CityName == city);
            });
    
            return features.sort((a, b) => b.properties.Value - a.properties.Value).slice(0, 25);

        } else {
            features = features.filter(val => {
                return (city == 'All' ? true : val['city'] == city);
            });
    
            return features.sort((a, b) => b.value - a.value).slice(0, 25);
        }
    }
}

/**
 * 管理擷取資訊的類別。
 */
class Fetch {
    /**
     * @var {string} logLevel 輸出日誌的等級。
     */
    static logLevel = 'Info';
    
    /**
     * 擷取指定頁面部件的方法。
     * @param {string} id 資源的名稱。
     * @param {string} containerId 儲存回應的容器名稱，可選參數。
     * @param {string} location 地圖的初始位置。
     */
    static async component(id, containerId = 'superContainer', location = '') {
        try {
            const response = await fetch(`../Backend/page.php?id=${id}`, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html'
                }
            });

            // 無法存取指定資源時，拋出錯誤。
            if (!response.ok) {
                throw new Error(`Error ${response.status} (${response.statusText})`);
            }

            // 若成功存取部件，將它加入到指定的容器中。
            const container = document.getElementById(containerId);
            if (container != null) {
                // 移除現存的圖表與地圖。
                if (d3) {
                    d3.select('#chart').html('');
                    d3.select('#tooltip').style('opacity', 0);
                }
                if (mapService && mapService.map) {
                    mapService.removeFromRef();
                    mapService.layers.length = 0;
                }

                // 將擷取的頁面加入。
                const component = await response.text();
                document.getElementById(containerId).innerHTML = component;
                
                // 重新初始化效果、綁定事件監聽器。
                downloadHandler();
                effectEmergeHandler();
                effectPanHandler();
                legendHandler();
                menuHandler();
                navigationHandler();
                resizableImageHandler();
                searchboxHandler();

                // 不同頁面的動態載入項目。
                switch (id) {
                    case 'main':
                        // 設定初始位置。
                        if (location instanceof Array) {
                            mapService.view.setCenter(ol.proj.fromLonLat(location));
                            mapService.view.setZoom(11);
                        }

                        // 加入基本圖層。
                        await mapService.getLayer('EMAP', true);
                        await mapService.getLayer('ORTHO', true, {visible: false});
                        await mapService.getLayer('OSM', true, {visible: false});

                        // 加入套疊圖層。
                        await mapService.getLayer('ACCIDENT', true, {visible: false});
                        await mapService.getLayer('CAMERA', true);

                        // 設定參照對象並渲染地圖。
                        mapService.setRef('map').addToRef().setInteraction();
                        mapHandler();
                        break;

                    case 'ranking':
                        chartService = new ChartService('chart');
                        await chartService.draw('All', 'All');
                        chartHandler();
                        break;

                    case 'welcome':
                        // 設定初始位置。
                        mapService.view.setCenter(ol.proj.fromLonLat([120.423, 23.300]));
                        mapService.view.setZoom(10);

                        // 加入基本圖層。
                        await mapService.getLayer('ORTHO', true);

                        // 加入套疊圖層。
                        await mapService.getLayer('BOUNDARY', true);

                        // 初始化地圖樣式。
                        effectPanHandler(document, true);

                        // 設定參照對象並渲染地圖。
                        mapService.setRef('coverMap').addToRef();

                        // 移除互動元素（不可移動、縮放等）
                        // 用 Spread operator 複製一個新的陣列，以免改變自身的集合。
                        for (const interaction of [... mapService.map.getInteractions().getArray()]) {
                            mapService.map.removeInteraction(interaction);
                        }
                        break;
                }

                // 輸出訊息
                if (this.logLevel == 'Debug') {
                    console.log(`Success: Fetch.component(\'${id}\', \'${containerId}\')`);
                }
            } else {
                throw new Error('Error 400 (invalid containerId)');
            }
        } catch (error) {
            console.log('Failed to fetch component:', error);
            document.getElementById('superContainer').innerHTML = `
                <p>
                    Failed to load content: ${error.message}
                </p>
            `;
        }
    }

    /**
     * 擷取指定圖徵的方法。
     * @param {string} id 資源的名稱。 
     * @param {string} format 檔案的格式，可選參數。
     * @param {string} mime 檔案格式的 MIME 代號，可選參數。
     */
    static async features(id, format = 'geojson', mime = 'application/geo+json') {
        try {
            const response = await fetch(`../Backend/feature.php?id=${id}&format=${format}`, {
                method: 'GET',
                headers: {
                    'Accept': mime
                }
            });

            // 無法存取指定資源時，拋出錯誤。
            if (!response.ok) {
                throw new Error(`Error ${response.status} (${response.statusText})`);
            }

            // 若成功存取資源，將它回傳。
            const features = await response.json();

            // 輸出訊息
            if (this.logLevel == 'Debug') {
                console.log(`Success: Fetch.features(\'${id}\'`);
            }

            return features;
        } catch (error) {
            console.log('Failed to fetch features:', error);
        }
    }

    /**
     * 擷取搜尋結果的方法。
     * @param {string} keyword 搜尋的關鍵字。
     */
    static async search(keyword) {
        try {
            const response = await fetch(`../Backend/search.php`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({q: keyword})
            });

            // 無法存取指定資源時，拋出錯誤。
            if (!response.ok) {
                throw new Error(`Error ${response.status} (${response.statusText})`);
            }

            // 若成功存取資源，將它回傳。
            const result = await response.text();

            // 輸出訊息
            if (this.logLevel == 'Debug') {
                console.log(`Success: Fetch.search(\'${keyword}\'`);
            }

            return JSON.parse(result);
        } catch (error) {
            console.log('Failed to fetch search:', error);
        }
    }
}

/**
 * 管理互動式地圖的類別。
 */
class MapService {
    /**
     * @var {Array<any>} controls 儲存地圖控制項目的欄位。
     */
    controls = [];

    /**
     * @var {ol.interaction} 管理使用者互動的把柄（Handle）。
     */
    interaction;

    /**
     * @var {Array<any>} layers 儲存圖層的欄位。
     */
    layers = [];

    /**
     * @var {ol.Map} map 儲存地圖的欄位。
     */
    map;

    /**
     * @var {string} ref 儲存參考對象名稱的欄位。
     */
    ref = 'map';

    /**
     * @var {ol.View} view 儲存視角的欄位。
     */
    view;

    /**
     * 建立互動式地圖的建構函式。
     * @param {string} ref 地圖將置入的對象名稱。
     */
    constructor(ref) {
        if (ref != null) {
            this.ref = ref;
            this.view = new ol.View({
                center: ol.proj.fromLonLat([120.35, 23.35]),
                maxZoom: 18.5,
                minZoom: 2.5,
                zoom: 10
            });
        }
    }

    /**
     * 將地圖添加至指定對象。
     * @param {ol.View} view 視角設定，可選參數。
     * @returns {MapService} 若有需要，此方法將回傳自身。
     */
    addToRef(view = this.view) {
        this.map = new ol.Map({
            controls: this.controls,
            layers: this.layers,
            view: view,
            target: this.ref
        });
        return this;
    }

    /**
     * 由圖徵屬性獲得測速照相的全時段舉發次數與收入。
     * @param {object} properties 圖徵的屬性。
     * @returns {Array<number | null>} 測速照相的舉發次數與收入。
     */
    static getIncome(properties) {
        // 計算舉發次數。
        let caseCount = Object.values(properties['Case'])
            .reduce((accumulator, currentValue) => {
                return accumulator + currentValue
            }, 0);
        
        // 篩選出所有獨特的值，若只有 null（無資料），將總數改為 null。
        const unique = Object.values(properties['Case']).filter((value, index, array) => array.indexOf(value) === index);
        if (unique.length == 1 && unique[0] == null) {
            caseCount = null;
        }
        
        // 由地點計算收入。
        let total = null;
        const location = properties['Address'];
        if (caseCount != null) {
            if (location.match(/國道|(?:台|臺)(?:61|82|84|86)|快速道路/g)) {
                total = caseCount * 3250;
            } else {
                total = caseCount * 1580;
            }
        }

        return [caseCount, total];
    }

    /**
     * 獲得指定的圖層。
     * @param {string} id 圖層的代號。接受的值：`ACCIDENT`－超速與未減速事故點位、`BOUNDARY`－縣市邊界 `CAMERA`－測速照相點位、`DUMMY`－測試用假資料、`EMAP`－臺灣通用電子地圖、`OSM`－OpenStreetMap、`ORTHO`－正射影像圖(通用)。
     * @param {boolean} addInPlace 是否直接加入圖層？可選參數。
     * @param {object} options 額外的圖層設定，可選參數。
     * @returns {ol.layer | null} 指定的圖層，或是不回傳東西。
     */
    async getLayer(id, addInPlace = false, options = {}) {
        let val;
        let layer;
        const layerId = `layer${id}`;
        switch (id) {
            // 超速、未減速事故點位
            case 'ACCIDENT':
                // val = await Fetch.features('accident')           // 每個事故點位各自為一個圖徵的版本，太卡了
                val = await Fetch.features('accident-aggregated');  // 將多個點位聚合為一個圖徵的版本，載入速度可接受
                layer = new ol.layer.Vector({
                    id: layerId,
                    source: new ol.source.Vector({
                        features: new ol.format.GeoJSON().readFeatures(val, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        })
                    }),
                    style: this.getStyle('accident'),
                    type: 'overlay'
                });
                break;
            
            // 縣市邊界
            case 'BOUNDARY':
                val = await Fetch.features('boundary', 'json', 'application/json');
                layer = new ol.layer.Vector({
                    id: layerId,
                    source: new ol.source.Vector({
                        features: new ol.format.TopoJSON({
                            layerName: 'boundary'
                        }).readFeatures(val, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        })
                    }),
                    style: this.getStyle('boundary'),
                    type: 'cover'
                });
                break;

            // 測速照相點位
            case 'CAMERA':
                val = await Fetch.features('camera'); 
                layer = new ol.layer.Vector({
                    id: layerId,
                    source: new ol.source.Vector({
                        features: new ol.format.GeoJSON().readFeatures(val, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        })
                    }),
                    style: this.getStyle('cameraSize'),
                    type: 'overlay'
                });
                break;

            // 測試用假資料
            case 'DUMMY':
                val = await Fetch.features('dummy'); 
                layer = new ol.layer.Vector({
                    id: layerId,
                    source: new ol.source.Vector({
                        features: new ol.format.GeoJSON().readFeatures(val, {
                            dataProjection: 'EPSG:4326',
                            featureProjection: 'EPSG:3857'
                        })
                    }),
                    style: new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 5,
                            fill: new ol.style.Fill({color: 'black'}),
                            stroke: new ol.style.Stroke({
                              color: [255, 0, 0], width: 2
                            })
                        })
                    }),
                    type: 'overlay'
                });
                break;

            // 臺灣通用電子地圖
            case 'EMAP':
                layer = new ol.layer.Tile({
                    extent: MapService.getProj(3857, 'Extent'),
                    id: layerId,
                    source: new ol.source.WMTS({
                        extent: MapService.getProj(3857, 'Extent'),
                        format: 'image/jpeg',
                        layer: 'EMAP',
                        matrixSet: 'GoogleMapsCompatible',
                        projection: MapService.getProj(3857),
                        style: 'default',
                        tileGrid: this.getTileGrid(3857),
                        url: 'http://wmts.nlsc.gov.tw/wmts?'
                    }),
                    type: 'base'
                });
                break;
            
            // OpenStreetMap
            case 'OSM':
                layer = new ol.layer.Tile({
                    id: layerId,
                    source: new ol.source.OSM(),
                    type: 'base'
                });
                break;
            
            // 正射影像圖(通用)
            case 'ORTHO':
                layer = new ol.layer.Tile({
                    extent: MapService.getProj(3857, 'Extent'),
                    id: layerId,
                    source: new ol.source.WMTS({
                        extent: MapService.getProj(3857, 'Extent'),
                        format: 'image/jpeg',
                        layer: 'PHOTO2',
                        matrixSet: 'GoogleMapsCompatible',
                        projection: MapService.getProj(3857),
                        style: 'default',
                        tileGrid: this.getTileGrid(3857),
                        url: 'http://wmts.nlsc.gov.tw/wmts?'
                    }),
                    type: 'base'
                });
                break;

            default:
                throw new Error('Invalid layer id');
        }

        // 額外屬性設定
        layer.setProperties(options, true);

        if (addInPlace) {
            this.layers.push(layer);
        }

        return Promise.resolve(layer);
    }

    /**
     * 獲得指定投影法的相關項目。
     * @param {number} epsg 指定投影法的 EPSG 代號。
     * @param {string} property 細部屬性，可選參數。
     * @return {ol.proj.Projection} 投影法物件。
     */
    static getProj(epsg, property = '') {
        const proj = `EPSG:${epsg}`;
        switch (property) {
            case 'Extent':
                return ol.proj.get(proj).getExtent();

            default:
                return ol.proj.get(proj);
        }
    }

    /**
     * 獲得指定圖層的樣式名稱。
     * @param {string} name 樣式的名稱。
     * @param {boolean} showNoData 是否顯示無資料圖徵？可選參數。
     */
    getStyle(name, showNoData = false) {

        /**
         * 根據圖徵屬性計算其顯示顏色、大小與渲染順序等項目。
         * @param {ol.feature.Feature} feature 單一圖徵。
         * @param {boolean} showNoData 是否顯示無資料圖徵？
         * @returns 指定圖徵的屬性。
         */
        const getCameraStyleProperties = (feature, showNoData) => {
            // 計算點的大小與顏色。半徑最大為 12 (>=5000萬)，最小為 4。無資料是灰色，圖層會在有資料的後方。
            const properties = feature.getProperties();
            const [caseCount, total] = MapService.getIncome(properties);
            const pointColor = properties['HasAnyData'] ? '#1859F0' : (showNoData ? '#646464' : '#FFFFFF00');
            const pointRadius = total / 5e7 * 8 + 4;
            const pointStroke = properties['HasAnyData'] ? '#F0F0F0' : (showNoData ? '#F0F0F0' : '#FFFFFF00');
            const pointZIndex = properties['HasAnyData'] ? 5 : 3;
            return [pointColor, pointRadius, pointStroke, pointZIndex];
        }

        switch (name) {
            case 'accident':
                return (function accidentStyle(feature) {
                    const isA1 = feature.getProperties()['Category'] == 'A1';
                    return new ol.style.Style({
                        image: new ol.style.RegularShape({
                            fill: new ol.style.Fill({
                                color: isA1 ? '#FF0000' : '#FFAB74'
                            }),
                            points: 3,
                            radius: isA1 ? 5 : 3,
                            rotation: 0,
                            rotateWithView: false,
                            stroke: new ol.style.Stroke({
                                color: '#F0F0F0',
                                width: isA1 ? 1 : 0.2
                            })
                        }),
                        zIndex: isA1 ? 3 : 2
                    });
                });
            
            case 'boundary':
                return (function boundaryStyle(feature) {
                    return new ol.style.Style({
                        fill: new ol.style.Fill({color: '#FFFFFF00'}),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFFF00'
                        }),
                        zIndex: 3
                    });
                });

            case 'boundaryHighlight':
                return (function boundaryHighlightStyle(feature) {
                    return new ol.style.Style({
                        fill: new ol.style.Fill({color: '#FFFFFF00'}),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFAA',
                            width: 2
                        }),
                        zIndex: 3
                    });
                });

            case 'boundaryLessHighlight':
                return (function boundaryLessHighlightStyle(feature) {
                    return new ol.style.Style({
                        fill: new ol.style.Fill({color: '#FFFFFF00'}),
                        stroke: new ol.style.Stroke({
                            color: '#FFFFFF99',
                            width: 2
                        }),
                        zIndex: 2
                    });
                });

            case 'camera':
                return (function cameraStyle(feature) {
                    const [pColor, pRadius, pStroke, pZIndex] = getCameraStyleProperties(feature, showNoData);
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({color: pColor}),
                            radius: 4,
                            stroke: new ol.style.Stroke({
                                color: pStroke,
                                width: 1
                            })
                        }),
                        zIndex: 5
                    });
                });

            case 'cameraSize':
                return (function cameraSizeStyle(feature) {
                    const [pColor, pRadius, pStroke, pZIndex] = getCameraStyleProperties(feature, showNoData);
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({color: pColor}),
                            radius: pRadius,
                            stroke: new ol.style.Stroke({
                                color: pStroke,
                                width: 1
                            })
                        }),
                        zIndex: pZIndex
                    });
                });

            case 'cameraSizeText':
                return (function cameraSizeStyle(feature) {
                    const [pColor, pRadius, pStroke, pZIndex] = getCameraStyleProperties(feature, showNoData);
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({color: pColor}),
                            radius: pRadius,
                            stroke: new ol.style.Stroke({
                                color: pStroke,
                                width: 1
                            })
                        }),
                        text: new ol.style.Text({
                            font: '13px Calibri,sans-serif',
                            fill: new ol.style.Fill({
                                color: feature.getProperties()['HasAnyData'] ? '#FFF' : (showNoData ? '#FFF' : '#FFFFFF00'),
                            }),
                            stroke: new ol.style.Stroke({
                                color: feature.getProperties()['HasAnyData'] ? '#000' : (showNoData ? '#000' : '#FFFFFF00'),
                                width: 1,
                            }),
                            text: feature.getProperties()['Limit']
                        }),
                        zIndex: pZIndex
                    });
                });

            case 'cameraText':
                return (function cameraStyle(feature) {
                    const [pColor, pRadius, pStroke, pZIndex] = getCameraStyleProperties(feature, showNoData);
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({color: pColor}),
                            radius: 4,
                            stroke: new ol.style.Stroke({
                                color: pStroke,
                                width: 1
                            })
                        }),
                        text: new ol.style.Text({
                            font: '13px Calibri,sans-serif',
                            fill: new ol.style.Fill({
                                color: feature.getProperties()['HasAnyData'] ? '#FFF' : (showNoData ? '#FFF' : '#FFFFFF00'),
                            }),
                            stroke: new ol.style.Stroke({
                                color: feature.getProperties()['HasAnyData'] ? '#000' : (showNoData ? '#000' : '#FFFFFF00'),
                                width: 1,
                            }),
                            text: feature.getProperties()['Limit']
                        }),
                        zIndex: 5
                    });
                });

            default:
                throw new Error('Invalid name.');
        }
    }

    /**
     * 獲得指定投影法的圖磚網格。
     * @param {number} epsg 指定投影法的 EPSG 代號。
     * @param {string} kind 圖磚的類型，可選參數。接受的值：`WMTS`－WMTS 圖磚。
     * @returns {ol.tilegrid} 圖磚網格。
     */
    getTileGrid(epsg, kind = 'WMTS') {
        const currentMaxZoom = Math.floor(this.view.getMaxZoom());
        const projExtent = MapService.getProj(epsg, 'Extent');

        const matrixIds = new Array(currentMaxZoom + 1);
        const resolutions = new Array(currentMaxZoom + 1);
        const size = ol.extent.getWidth(projExtent) / 256;
        for (let z = 0; z < currentMaxZoom + 1; ++z) {   
            resolutions[z] = size / Math.pow(2, z);
            matrixIds[z] = z;
        }

        if (kind == 'WMTS') {
            return new ol.tilegrid.WMTS({
                matrixIds: matrixIds,
                origin: ol.extent.getTopLeft(projExtent),
                resolutions: resolutions,
            });
        } else {
            throw new Error('Invalid kind.');
        }
    }

    /**
     * 將地圖從指定對象中移除。
     * @returns {MapService} 若有需要，此方法將回傳自身。
     */
    removeFromRef() {
        this.map.setTarget(null);
        return this;
    }

    /**
     * 在基本圖層開啟／關閉低飽和度的濾鏡。
     * @param {boolean} desaturate 是否要使用低飽和度的底圖？
     */
    saturateBaseLayer(desaturate) {
        this.layers.forEach(layer => {
            if (layer.get('type') == 'base') {
                if (desaturate) {
                    layer.on('postrender', this.saturationFilter);
                } else {
                    layer.un('postrender', this.saturationFilter);
                }
                // 強迫地圖更新。
                layer.changed();
            }
        });
    }

    /**
     * 低飽和度的濾鏡。
     * @param {Event} e 事件對象。 
     */
    saturationFilter(e) {
        const context = e.context;
        context.filter = 'saturate(0.3)';
        context.drawImage(context.canvas, 0, 0);
    }

    /**
     * 根據搜尋條件選取圖徵。
     * @param {object} query 搜尋條件。
     */
    selectFeatures(query) {
        // 取得所有圖徵。
        let features;
        for (const currentLayer of this.layers) {
            if (currentLayer.get('id') == 'layerCAMERA') {
                features = currentLayer.getSource().getFeatures();
                break;
            }
        }

        // 篩選出符合的圖徵。
        let filteredFeatures = features;
        for (const queryKey of Object.keys(query)) {
            filteredFeatures = filteredFeatures.filter(feature => {
                return Object.keys(feature.getProperties()).includes(queryKey) ? feature.getProperties()[queryKey] == query[queryKey] : false;
            });
        }

        // 尋找並找到選擇事件的參考。
        let selectInteraction;
        this.map.getInteractions().forEach(interaction => {
            if (interaction instanceof ol.interaction.Select) {
                selectInteraction = interaction;
            }
        });

        // 強行觸發選擇圖徵事件。
        let selectedFeatures = selectInteraction.getFeatures();
        selectedFeatures.clear();
        selectedFeatures.extend(filteredFeatures)
        selectInteraction.dispatchEvent({
            type: 'select',
            selected: selectedFeatures.getArray(),
            deselected: [],
        });
    }

    /**
     * 設定測速照相圖層的樣式。
     * @param {boolean} dynamicSize 是否使用圓圈大小表示收入？
     * @param {boolean} showNoData 是否顯示無資料圖徵？
     * @param {boolean} showSpeedLimit 是否顯示速限？
     */
    setCameraLayerStyle(dynamicSize, showNoData, showSpeedLimit) {
        this.layers.forEach(layer => {
            if (layer.get('id') == 'layerCAMERA') {
                if (showSpeedLimit) {
                    layer.setStyle(dynamicSize ? this.getStyle('cameraSizeText', showNoData) : this.getStyle('cameraText', showNoData));
                } else {
                    layer.setStyle(dynamicSize ? this.getStyle('cameraSize', showNoData) : this.getStyle('camera', showNoData));
                }
            }
        });
    }

    /**
     * 設定管理使用者互動的把柄。
     */
    setInteraction() {
        // 附加把柄。
        this.interaction = new ol.interaction.Select({
            style: null
        });
        this.map.addInteraction(this.interaction);

        // 添加事件監聽者。
        this.interaction.on('select', e => {
            const infoBox = document.querySelector('.infoBox');
        
            /**
             * 更新資訊欄資訊的函式。
             * @param {Object} properties 選取圖徵的屬性。
             */
            const updateInfoBox = (properties) => {
                document.getElementById('cameraAddress').textContent = properties.Address || '未知地址';
                document.getElementById('cameraAddress').title = properties.Address || '未知地址';
                document.getElementById('cameraDirection').textContent = properties.Direction || '未知方向';
                document.getElementById('cameraType').textContent = properties.Type || '未知形式';
                document.getElementById('cameraSpeedLimit').textContent = properties.Limit || '未知速限';

                const [count, income] = MapService.getIncome(properties);
                document.getElementById('cameraIncome').textContent = properties.HasAnyData ? `${Math.round(income / 10000)} 萬` : '無紀錄';
            };
        
            /**
             * 清空資訊框內容的函式。
             */
            const resetInfoBox = () => {
                document.getElementById('cameraAddress').textContent = '';
                document.getElementById('cameraAddress').title = '';
                document.getElementById('cameraDirection').textContent = '';
                document.getElementById('cameraType').textContent = '';
                document.getElementById('cameraSpeedLimit').textContent = '';
                document.getElementById('cameraIncome').textContent = '';
            };
        
            if (e.selected.length > 0) {
                const selectedLayer = this.interaction.getLayer(e.selected[0]).get('id');
                if (selectedLayer === 'layerCAMERA') {
                    const properties = e.selected[0].getProperties();
                    updateInfoBox(properties);
                    infoBox.classList.add('fire');
                } else {
                    resetInfoBox();
                    infoBox.classList.remove('fire');
                }
            } else {
                resetInfoBox();
                infoBox.classList.remove('fire');
            }
        });
    }

    /**
     * 設定新的地圖容器。
     * @param {string} ref 指定對象。
     * @returns {MapService} 若有需要，此方法將回傳自身。
     */
    setRef(ref) {
        this.ref = ref;
        return this;
    }

    /**
     * 切換基本圖層。
     * @param {string} layerId 圖層的代號。
     */
    switchBaseLayer(layerId) {
        this.layers.forEach(layer => {
            if (layer.get('type') == 'base') {
                const id = layer.get('id');
                if (id) {
                    layer.setVisible(id === layerId);
                }
            }
        });
    }

    /**
     * 切換套疊圖層。
     * @param {string} layerId 圖層的代號。
     */
    toggleOverlayLayer(layerId) {
        this.layers.forEach(layer => {
            if (layer.get('type') == 'overlay') {
                const id = layer.get('id');
                if (id === layerId) {
                    layer.setVisible(!layer.getVisible());
                    return;
                }
            }
        });
    }
}

/**
 * @var {Chart} chartService 儲存圖表服務的物件。 
 */
let chartService = new ChartService();

/**
 * @var {MapService} mapService 儲存地圖服務的物件。
 */
let mapService = new MapService();

/**
 * 管理圖表呈現的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const chartHandler = (root = document) => {
    // 選擇年份及地點的下拉式選單。
    const chartInitiator = root.getElementsByClassName('rankSelector');

    /**
     * 產生排行榜列表。
     * @param {string} city 指定的縣市。
     * @param {string} year 指定的年份。
     */
    const generateList = (city, year) => {
        const data = chartService.extractData(city, year);
        const rankingListElement = document.querySelector('.rankingListContent');
        rankingListElement.innerHTML = '';
        data.forEach((item, index) => {
            const listItem = document.createElement('li');
            const rankItem = document.createElement('div');
            rankItem.title = item.address;
            rankItem.classList.add('rankItem');

            const rankNumber = document.createElement('span');
            rankNumber.classList.add('rankNumber');
            rankNumber.textContent = `${index + 1}.`;

            const rankLocation = document.createElement('span');
            rankLocation.classList.add('rankLocation');
            rankLocation.textContent = item.address;

            const rankIncome = document.createElement('span');
            rankIncome.classList.add('rankIncome');
            rankIncome.textContent = `${Math.floor(item.value / 10000)} 萬`;

            rankItem.appendChild(rankNumber);
            rankItem.appendChild(rankLocation);
            rankItem.appendChild(rankIncome);
            listItem.appendChild(rankItem);
            rankingListElement.appendChild(listItem);

            rankItem.addEventListener('click', () => {
                Fetch.component('main', 'superContainer', item.coordinate);
            });
        });
    }

    for (const initiator of chartInitiator) {
        initiator.addEventListener('change', () => {
            const city = document.getElementById('rankingCitySelector');
            const year = document.getElementById('rankingYearSelector');
            if (city && year) {
                chartService.draw(city.value, year.value);
                generateList(city.value, year.value);
            }
        });
    }

    generateList('All', 'All');
}

/**
 * 管理資料下載的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const downloadHandler = (root = document) => {
    const downloadButton = root.querySelectorAll('.rankDownload');
    for (const initiator of downloadButton) {
        initiator.addEventListener('click', () => {
            const city = root.getElementById('rankingCitySelector');
            const year = root.getElementById('rankingYearSelector');
            if (city && year) {
                const file = {
                    type: 'FeatureCollection',
                    crs: {
                        type: 'name',
                        properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
                    },
                    features: chartService.extractData(city.value, year.value, true)
                }
                const tempAnchor = document.createElement('a');
                const blobURL = window.URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'}));
                tempAnchor.classList.add('rankDownloadAnchor');
                tempAnchor.href = blobURL;
                tempAnchor.target = '_self',
                tempAnchor.rel = 'noopener',
                tempAnchor.download = 'top25.geojson';

                document.body.appendChild(tempAnchor);
                tempAnchor.click();
                document.body.removeChild(tempAnchor);
                window.URL.revokeObjectURL(blobURL);
            }
        });
    }
}

/**
 * 管理浮現特效的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const effectEmergeHandler = (root = document) => {
    const effectEmergeTargets = root.getElementsByClassName('effectEmerge');

    // 觀察子元素和父元素交集情況的 API
    const emergeObserver = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fire');
                } else {
                    entry.target.classList.remove('fire');
                }
            });
        },
        {
            // 觸發條件閾值
            threshold: 0.1
        }
    );
    for (const target of effectEmergeTargets) {
        emergeObserver.observe(target);
    }
}

/**
 * 管理平移特效的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 * @param {boolean} initialize 是否初始化地圖？可選參數。
 */
const effectPanHandler = (root = document, initialize = false) => {
    /**
     * 凸顯特定縣市。
     * @param {string} name 縣市的名稱。
     */
    const highlightCounty = name => {
        let layer;
        for (const currentLayer of mapService.layers) {
            if (currentLayer.get('id') == 'layerBOUNDARY') {
                layer = currentLayer;
                break;
            }
        }
        const availableCounties = [...document.querySelectorAll('.effectPan')].map(v => {
            return v.dataset.key;
        });
        layer.getSource().getFeatures().forEach(feature => {
            if (name == feature.getProperties()['Name']) {
                feature.setStyle(mapService.getStyle('boundaryHighlight'));
            } else if (availableCounties.includes(feature.getProperties()['Name'])) {
                feature.setStyle(mapService.getStyle('boundaryLessHighlight'));
            } else {
                feature.setStyle(mapService.getStyle('boundary'));
            }
        });
    }

    if (initialize) {
        highlightCounty('');
        return;
    }

    const effectPanInitiators = root.getElementsByClassName('effectPan');
    for (const initiator of effectPanInitiators) {
        initiator.addEventListener('mouseenter', () => {
            highlightCounty(initiator.dataset.key);
            mapService.view.animate({
                center: ol.proj.fromLonLat(JSON.parse(initiator.dataset.location)),
                duration: 300
            });
        });
    }
}

/**
 * 管理圖例的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const legendHandler = (root = document) => {
    const legendBoxButton = root.querySelectorAll('.legendBox button');
    for (const initiator of legendBoxButton) {
        initiator.addEventListener('click', () => {
            for (const legendContainer of root.querySelectorAll('.legendBox ul')) {
                legendContainer.classList.toggle('fire');
            }
        });
    }
}

/**
 * 管理地圖相關控制項目的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const mapHandler = (root = document) => {
    // 放大地圖按鈕
    const zoomInInitiator  = root.querySelector('.mapZoomInButton');
    zoomInInitiator.addEventListener('click', () => {
        const currentZoom = mapService.view.getZoom();
        if (currentZoom + 1 < mapService.view.getMaxZoom()) {
            mapService.view.animate({
                duration: 200,
                zoom: currentZoom + 1
            });
        }
    });

    // 縮小地圖按鈕
    const zoomOutInitiator = root.querySelector('.mapZoomOutButton');
    zoomOutInitiator.addEventListener('click', () => {
        const currentZoom = mapService.view.getZoom();
        if (currentZoom - 1 > mapService.view.getMinZoom()) {
            mapService.view.animate({
                duration: 200,
                zoom: currentZoom - 1
            });
        }
    });
}

/**
 * 管理選單的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const menuHandler = (root = document) => {
    const menuInitiator = root.querySelectorAll('.menuInitiator');

    /**
     * 切換鍵盤導航順序的函式。
     */
    const switchTabIndex = () => {
        const val = root.querySelector('.menuCloseButton').getAttribute('tabindex');
        if (val == '-1') {
            root.querySelector('.menuCloseButton').setAttribute('tabindex', '0');
        } else {
            root.querySelector('.menuCloseButton').setAttribute('tabindex', '-1');
        }
    }

    for (const initiator of menuInitiator) {
        initiator.addEventListener('click', e => {
            root.querySelector('.menu').classList.toggle('fire');
            switchTabIndex();
        });
    }

    // 當按下 Escape 鍵且選單開啟時，收合選單。
    root.addEventListener('keydown', e => {
        if (root.querySelector('.menu.fire') && (e.key == 'Escape')) {
            root.querySelector('.menu').classList.remove('fire');
            switchTabIndex();
        }
    });

    // 當切換選單選項時，做出相對應的設定。

    // 切換基本圖層。
    const baseLayerRadios = document.querySelectorAll('input[name="baseLayer"]');
    baseLayerRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            mapService.switchBaseLayer(e.target.id);
        });
    });

    // 切換套疊圖層。
    const overlayChackboxes = document.querySelectorAll('.overlays.layers input');
    overlayChackboxes.forEach(checkbox => {
        checkbox.addEventListener('change', e => {
            mapService.toggleOverlayLayer(e.target.id);
        });
    });

    // 切換測速照相點位的樣式。
    const cameraStyleCheckboxes = document.querySelectorAll('#optionNoData, #optionSpeedLimit, #optionIncomeSize');
    cameraStyleCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const cameraNoDataCheckbox  = document.querySelector('#optionNoData');
            const cameraSpeedLimitCheckbox = document.querySelector('#optionSpeedLimit');
            const cameraIncomeSizeCheckbox = document.querySelector('#optionIncomeSize');
            if (cameraNoDataCheckbox && cameraSpeedLimitCheckbox && cameraIncomeSizeCheckbox) {
                mapService.setCameraLayerStyle(cameraIncomeSizeCheckbox.checked, cameraNoDataCheckbox.checked, cameraSpeedLimitCheckbox.checked);
            }
        });
    });

    // 設定低飽和度底圖。
    const desaturateCheckboxes = document.querySelectorAll('#optionDesaturate');
    desaturateCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', e => {
            mapService.saturateBaseLayer(e.target.checked);
        });
    });
}

/**
 * 管理頁面導航的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const navigationHandler = (root = document) => {
    const navigationInitiatorsAnchor = root.querySelectorAll('a.navbarLink, a.menuLink');
    for (const initiator of navigationInitiatorsAnchor) {
        initiator.addEventListener('click', e => {
            e.preventDefault();
            const target = initiator.getAttribute('href');
            switch (target) {
                case '#about':
                    Fetch.component('about');
                    break;

                case '#map':
                    Fetch.component('main');
                    break;

                case '#ranking':
                    Fetch.component('ranking');
                    break;

                case '#welcome':
                    Fetch.component('welcome');
                    break;
            
                default:
                    break;
            }
        });
    }

    const navigationInitiatorsButton = root.querySelectorAll('button.buttonLink');
    for (const initiator of navigationInitiatorsButton) {
        initiator.addEventListener('click', e => {
            e.preventDefault();
            Fetch.component('main', 'superContainer', JSON.parse(initiator.dataset.location));
        });
    }
}

/**
 * 管理圖片縮放的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const resizableImageHandler = (root = document) => {
    const resizableImages = root.querySelectorAll('[resizable]');
    /**
     * 根據網頁寬度改變圖片中心位置。
     */
    const resize = () => {
        const xPixel = document.body.clientWidth <= 720 ? document.body.clientWidth - 720 : 0;
        const yPixel = document.body.clientWidth >= 720 ? (720 - document.body.clientWidth) * 0.42 : 0;
        for (const image of resizableImages) {
            image.style.backgroundPosition = `${xPixel}px ${yPixel}px`;
        }
    }
    window.addEventListener('resize', () => {
        resize();
    });

    // 載入新頁面時強制偵測大小。
    resize();
}

/**
 * 管理搜尋框的函式。
 * @param {HTMLElement} root 管理範圍的根元素，可選參數。
 */
const searchboxHandler = (root = document) => {
    let focusedIndex = -1;
    const searchbox = root.getElementById('q');
    const suggestionAnchor = root.querySelectorAll('.autocompleteList');

    if (searchbox) {
        // 擷取搜尋結果並顯示。
        searchbox.addEventListener('input', async () => {
            const query = searchbox.value.trim();
            if (query.length < 2) {
                suggestionAnchor[0].innerHTML = '';
                focusedIndex = -1;
                return;
            }
            const suggestions = await Fetch.search(query);
            suggestionAnchor[0].innerHTML = '';
            suggestions.slice(0, 3).forEach(suggestion => {
                const listItem = document.createElement('li');
                listItem.setAttribute('tabindex', '0');
                listItem.textContent = suggestion['Address'];
                listItem.title = suggestion['Address'];
                listItem.addEventListener('click', () => {
                    mapService.view.animate({
                        center: ol.proj.fromLonLat(suggestion['Coordinate']),
                        duration: 300,
                        zoom: 16
                    });
                });
                suggestionAnchor[0].appendChild(listItem);
            });
            focusedIndex = -1;
        });

        // 當搜尋框被關注時，顯示自動完成框。
        searchbox.addEventListener('focus', () => {
            suggestionAnchor[0].style.display = '';
        });

        // 當搜尋框不被關注時，隱藏自動完成框。
        searchbox.addEventListener('blur', () => {
            setTimeout(() => {
                if (document.activeElement.tagName != 'LI') {
                    suggestionAnchor[0].style.display = 'none';
                }
            }, 50);
        });

        // 清除自動完成框，並且複製其值到搜尋框中。
        suggestionAnchor[0].addEventListener('click', e => {
            if (e.target.tagName === 'LI') {
                searchbox.value = e.target.textContent;
                suggestionAnchor[0].innerHTML = '';
                focusedIndex = -1;
                mapService.selectFeatures({'Address': e.target.textContent});
            }
        });
        
        // Enter鍵也可以當作點擊看待
        suggestionAnchor[0].addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.target.click();
            }
        });
    }
}

// 前端腳本入口點
window.addEventListener('load', () => {
    Fetch.component('welcome');
    chartService = new ChartService('chart');
    mapService = new MapService('coverMap');
});