// Initialize the map
let map;
let markers = [];
let measurementMode = false;
let drawingMode = false;
let measurementPoints = [];
let polygonPoints = [];
let currentPolyline = null;
let currentPolygon = null;

// Base map layers
const baseLayers = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '© Esri'
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: '© OpenTopoMap contributors'
    })
};

// Initialize map
function initMap() {
    // Create map centered on Beijing (can be changed to any default location)
    map = L.map('map').setView([39.9042, 116.4074], 13);
    
    // Add default base layer
    baseLayers.osm.addTo(map);
    
    // Add scale control
    L.control.scale({
        imperial: false,
        metric: true
    }).addTo(map);
    
    // Map event listeners
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('zoomend', updateCoordinates);
    map.on('moveend', updateCoordinates);
    
    // Initial coordinate update
    updateCoordinates();
}

// Update coordinates display
function updateCoordinates() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const coordsDisplay = document.getElementById('coordinates');
    coordsDisplay.textContent = `经度: ${center.lng.toFixed(6)} | 纬度: ${center.lat.toFixed(6)} | 缩放: ${zoom}`;
}

// Handle mouse move to show current position
function handleMouseMove(e) {
    if (measurementMode && measurementPoints.length > 0) {
        // Show temporary line while measuring
        if (currentPolyline) {
            map.removeLayer(currentPolyline);
        }
        const tempPoints = [...measurementPoints, e.latlng];
        currentPolyline = L.polyline(tempPoints, {
            color: '#ff6b6b',
            weight: 3,
            dashArray: '10, 5'
        }).addTo(map);
    }
}

// Handle map clicks
function handleMapClick(e) {
    const lat = e.latlng.lat.toFixed(6);
    const lng = e.latlng.lng.toFixed(6);
    
    // Update info panel
    updateInfoPanel(`
        <strong>点击位置:</strong><br>
        纬度: ${lat}<br>
        经度: ${lng}
    `);
    
    if (measurementMode) {
        addMeasurementPoint(e.latlng);
    } else if (drawingMode) {
        addPolygonPoint(e.latlng);
    }
}

// Add marker
function addMarker(latlng, customText = '') {
    const marker = L.marker(latlng, {
        draggable: true
    }).addTo(map);
    
    // Store index before pushing to array
    const markerIndex = markers.length;
    
    const popupContent = `
        <div class="marker-popup">
            <h4>📍 标记点</h4>
            <p><strong>纬度:</strong> ${latlng.lat.toFixed(6)}</p>
            <p><strong>经度:</strong> ${latlng.lng.toFixed(6)}</p>
            ${customText ? `<p>${customText}</p>` : ''}
            <button onclick="removeMarker(${markerIndex})" style="margin-top: 8px; padding: 4px 8px; background: #ff6b6b; color: white; border: none; border-radius: 4px; cursor: pointer;">删除</button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.on('dragend', function(e) {
        const newPos = e.target.getLatLng();
        updateInfoPanel(`标记移动到: ${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`);
    });
    
    markers.push(marker);
    return marker;
}

// Remove marker
function removeMarker(index) {
    if (markers[index]) {
        map.removeLayer(markers[index]);
        markers.splice(index, 1);
        updateInfoPanel('标记已删除');
    }
}

// Measurement functions
function addMeasurementPoint(latlng) {
    measurementPoints.push(latlng);
    
    // Add marker for this point
    const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#ff6b6b',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.8
    }).addTo(map);
    markers.push(marker);
    
    // If we have at least 2 points, draw line and calculate distance
    if (measurementPoints.length >= 2) {
        const polyline = L.polyline(measurementPoints, {
            color: '#ff6b6b',
            weight: 3
        }).addTo(map);
        markers.push(polyline);
        
        // Calculate total distance
        let totalDistance = 0;
        for (let i = 0; i < measurementPoints.length - 1; i++) {
            totalDistance += measurementPoints[i].distanceTo(measurementPoints[i + 1]);
        }
        
        const distanceKm = (totalDistance / 1000).toFixed(2);
        const distanceM = totalDistance.toFixed(2);
        
        updateInfoPanel(`
            <strong>测量距离:</strong><br>
            ${distanceKm} 公里<br>
            ${distanceM} 米<br>
            <small>点击继续添加点，或点击"测量距离"按钮结束</small>
        `);
        
        // Add popup to polyline
        polyline.bindPopup(`距离: ${distanceKm} km`).openPopup();
    }
}

// Polygon drawing functions
function addPolygonPoint(latlng) {
    polygonPoints.push(latlng);
    
    // Add marker for this point
    const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#4CAF50',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.8
    }).addTo(map);
    markers.push(marker);
    
    // Update polygon
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
    }
    
    if (polygonPoints.length >= 2) {
        currentPolygon = L.polygon(polygonPoints, {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map);
        
        // Calculate area
        const area = L.GeometryUtil.geodesicArea(polygonPoints);
        const areaKm2 = (area / 1000000).toFixed(2);
        const areaM2 = area.toFixed(2);
        
        updateInfoPanel(`
            <strong>多边形面积:</strong><br>
            ${areaKm2} 平方公里<br>
            ${areaM2} 平方米<br>
            <small>点击继续添加点，或点击"绘制多边形"按钮结束</small>
        `);
        
        currentPolygon.bindPopup(`面积: ${areaKm2} km²`);
    }
}

// Geolocation
function locateUser() {
    updateInfoPanel('正在定位...');
    
    map.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true
    });
    
    map.on('locationfound', function(e) {
        const marker = L.marker(e.latlng).addTo(map);
        marker.bindPopup(`
            <strong>您的位置</strong><br>
            精度: ±${e.accuracy.toFixed(0)} 米
        `).openPopup();
        markers.push(marker);
        
        // Add accuracy circle
        const circle = L.circle(e.latlng, {
            radius: e.accuracy,
            color: '#667eea',
            fillColor: '#667eea',
            fillOpacity: 0.2
        }).addTo(map);
        markers.push(circle);
        
        updateInfoPanel(`定位成功！精度: ±${e.accuracy.toFixed(0)} 米`);
    });
    
    map.on('locationerror', function(e) {
        updateInfoPanel(`定位失败: ${e.message}`);
    });
}

// Search/Geocoding (using Nominatim)
async function searchLocation() {
    const query = document.getElementById('searchBox').value.trim();
    if (!query) {
        updateInfoPanel('请输入搜索内容');
        return;
    }
    
    updateInfoPanel('搜索中...');
    
    // Check if input is coordinates (lat,lng or lng,lat)
    const coordPattern = /^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/;
    const match = query.match(coordPattern);
    
    if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        // Check which is likely lat and which is lng
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            map.setView([lat, lng], 15);
            const marker = addMarker(L.latLng(lat, lng), '搜索结果');
            marker.openPopup();
            updateInfoPanel(`找到坐标: ${lat}, ${lng}`);
            return;
        }
    }
    
    // Otherwise, search using Nominatim
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            const latlng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
            map.setView(latlng, 15);
            const marker = addMarker(latlng, result.display_name);
            marker.openPopup();
            updateInfoPanel(`找到: ${result.display_name}`);
        } else {
            updateInfoPanel('未找到结果，请尝试其他搜索词');
        }
    } catch (error) {
        updateInfoPanel('搜索出错，请稍后重试');
        console.error('Search error:', error);
    }
}

// Update info panel
function updateInfoPanel(html) {
    document.getElementById('infoPanel').innerHTML = html;
}

// Clear all markers and drawings
function clearAll() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    measurementPoints = [];
    polygonPoints = [];
    if (currentPolyline) {
        map.removeLayer(currentPolyline);
        currentPolyline = null;
    }
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
    measurementMode = false;
    drawingMode = false;
    document.getElementById('measureDistanceBtn').classList.remove('active');
    document.getElementById('drawPolygonBtn').classList.remove('active');
    updateInfoPanel('所有标记和绘图已清除');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    initMap();
    
    // Layer control
    document.querySelectorAll('input[name="baseLayer"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Remove all base layers
            Object.values(baseLayers).forEach(layer => map.removeLayer(layer));
            // Add selected layer
            baseLayers[this.value].addTo(map);
        });
    });
    
    // Add marker button
    document.getElementById('addMarkerBtn').addEventListener('click', function() {
        const center = map.getCenter();
        addMarker(center, '手动添加的标记');
        updateInfoPanel('标记已添加到地图中心');
    });
    
    // Measure distance button
    document.getElementById('measureDistanceBtn').addEventListener('click', function() {
        if (measurementMode) {
            // End measurement mode
            measurementMode = false;
            measurementPoints = [];
            if (currentPolyline) {
                map.removeLayer(currentPolyline);
                currentPolyline = null;
            }
            this.classList.remove('active');
            updateInfoPanel('测量模式已关闭');
        } else {
            // Start measurement mode
            measurementMode = true;
            drawingMode = false;
            measurementPoints = [];
            this.classList.add('active');
            document.getElementById('drawPolygonBtn').classList.remove('active');
            updateInfoPanel('测量模式: 点击地图添加测量点');
        }
    });
    
    // Draw polygon button
    document.getElementById('drawPolygonBtn').addEventListener('click', function() {
        if (drawingMode) {
            // End drawing mode
            drawingMode = false;
            polygonPoints = [];
            if (currentPolygon) {
                markers.push(currentPolygon);
            }
            currentPolygon = null;
            this.classList.remove('active');
            updateInfoPanel('绘制模式已关闭');
        } else {
            // Start drawing mode
            drawingMode = true;
            measurementMode = false;
            polygonPoints = [];
            this.classList.add('active');
            document.getElementById('measureDistanceBtn').classList.remove('active');
            updateInfoPanel('绘制模式: 点击地图添加多边形顶点');
        }
    });
    
    // Clear all button
    document.getElementById('clearAllBtn').addEventListener('click', function() {
        if (confirm('确定要清除所有标记和绘图吗？')) {
            clearAll();
        }
    });
    
    // Locate button
    document.getElementById('locateBtn').addEventListener('click', locateUser);
    
    // Search button
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    
    // Search on Enter key
    document.getElementById('searchBox').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
});

// Geometry utility for area calculation
// Earth's radius in meters
const EARTH_RADIUS = 6378137.0;

L.GeometryUtil = L.extend(L.GeometryUtil || {}, {
    geodesicArea: function (latLngs) {
        const pointsCount = latLngs.length;
        let area = 0.0;
        const d2r = Math.PI / 180;
        let p1, p2;

        if (pointsCount > 2) {
            for (let i = 0; i < pointsCount; i++) {
                p1 = latLngs[i];
                p2 = latLngs[(i + 1) % pointsCount];
                area += ((p2.lng - p1.lng) * d2r) *
                        (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
            }
            area = area * EARTH_RADIUS * EARTH_RADIUS / 2.0;
        }

        return Math.abs(area);
    }
});
