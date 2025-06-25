// SVEC Bus Tracker - Track Page JavaScript
// Handles bus tracking functionality, real-time location updates, and map integration

class SVECBusTracker {
    constructor() {
        this.currentBus = null;
        this.trackerId = null;
        this.watchId = null;
        this.map = null;
        this.busMarker = null;
        this.userMarker = null;
        this.isTracking = false;
        this.autoRefreshInterval = null;
        this.locationUpdateInterval = null;
        
        // Configuration
        this.config = {
            locationUpdateFrequency: 10000, // 10 seconds
            autoRefreshFrequency: 30000,    // 30 seconds
            maxTrackers: 4,
            defaultCenter: { lat: 16.5062, lng: 80.6480 }, // Andhra Pradesh center
            collegeLocation: { lat: 16.7474, lng: 81.1788 } // SVEC approximate location
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeMap();
        this.handleURLParams();
        this.startAutoRefresh();
        this.setupCleanup();
    }

    bindEvents() {
        // Search button
        const searchBtn = document.querySelector('[onclick="searchBus()"]');
        if (searchBtn) {
            searchBtn.onclick = () => this.searchBus();
        }

        // Tracking buttons
        const trackBtn = document.getElementById('trackBtn');
        const stopBtn = document.getElementById('stopBtn');
        const viewBtn = document.getElementById('viewBtn');

        if (trackBtn) trackBtn.onclick = () => this.startTracking();
        if (stopBtn) stopBtn.onclick = () => this.stopTracking();
        if (viewBtn) viewBtn.onclick = () => this.viewBus();

        // Enter key support for bus number input
        const busNumberInput = document.getElementById('busNumber');
        if (busNumberInput) {
            busNumberInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBus();
                }
            });
        }

        // District select change
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect) {
            districtSelect.addEventListener('change', () => {
                if (districtSelect.value) {
                    document.getElementById('busNumber').value = '';
                    this.searchBus();
                }
            });
        }

        // Clear district when typing bus number
        if (busNumberInput && districtSelect) {
            busNumberInput.addEventListener('input', () => {
                if (busNumberInput.value.trim()) {
                    districtSelect.value = '';
                }
            });
        }
    }

    initializeMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        // Initialize with placeholder
        this.updateMapPlaceholder('Select a bus to view location');
    }

    updateMapPlaceholder(message, showLocation = false, lat = null, lng = null) {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        let content = `
            <div class="d-flex align-items-center justify-content-center h-100 bg-light">
                <div class="text-center">
        `;

        if (showLocation && lat && lng) {
            content += `
                <i class="fas fa-map-marker-alt fa-3x text-success mb-3"></i>
                <h6 class="text-success">Bus Location</h6>
                <p class="text-muted mb-2">
                    <strong>Coordinates:</strong><br>
                    Lat: ${lat.toFixed(6)}<br>
                    Lng: ${lng.toFixed(6)}
                </p>
                <small class="text-success">
                    ${this.isTracking ? 'Live tracking active' : 'Last known location'}
                </small>
            `;
        } else {
            content += `
                <i class="fas fa-map fa-3x text-muted mb-3"></i>
                <p class="text-muted">${message}</p>
                <small class="text-muted">Google Maps integration available in production</small>
            `;
        }

        content += `
                </div>
            </div>
        `;

        mapElement.innerHTML = content;
    }

    async searchBus() {
        const busNumber = document.getElementById('busNumber')?.value.trim();
        const district = document.getElementById('districtSelect')?.value;
        
        if (!busNumber && !district) {
            this.showAlert('Please enter a bus number or select a district', 'warning');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const url = busNumber ? `/api/bus/${busNumber}` : `/api/routes/${district}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (busNumber) {
                this.displayBusInfo(busNumber, data);
            } else {
                this.displayDistrictBuses(data);
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showAlert('Bus not found or error occurred. Please check the bus number and try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    displayBusInfo(busNumber, busData) {
        this.currentBus = busNumber;
        
        // Update UI elements
        const busDetails = document.getElementById('busDetails');
        const routeInfo = document.getElementById('routeInfo');
        const busStatus = document.getElementById('busStatus');
        const busInfo = document.getElementById('busInfo');
        
        if (busDetails) {
            busDetails.innerHTML = `<i class="fas fa-bus"></i> ${busNumber}`;
        }
        
        if (routeInfo) {
            routeInfo.innerHTML = `<i class="fas fa-route"></i> ${busData.route_name}`;
        }
        
        // Status badge with appropriate color
        let statusClass = 'bg-secondary';
        let statusText = 'Stopped';
        
        if (busData.status === 'tracking') {
            statusClass = 'bg-success';
            statusText = 'Live Tracking';
        } else if (busData.status === 'moving') {
            statusClass = 'bg-info';
            statusText = 'Moving';
        }
        
        if (busStatus) {
            busStatus.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <strong>Status:</strong><br>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="col-6">
                        <strong>Trackers:</strong><br>
                        <span class="badge bg-primary">${busData.tracker_count}/${busData.max_trackers}</span>
                    </div>
                </div>
                <div class="mt-2">
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> Last Updated: ${new Date(busData.last_updated).toLocaleString()}
                    </small>
                </div>
            `;
        }
        
        // Show bus info panel
        if (busInfo) {
            busInfo.classList.remove('d-none');
        }
        
        // Update tracking button states
        this.updateTrackingButtons(busData);
        
        // Update map and route details
        if (busData.current_lat && busData.current_lng) {
            this.updateMapLocation(busData.current_lat, busData.current_lng);
        } else {
            this.updateMapPlaceholder('No location data available for this bus');
        }
        
        this.updateRouteDetails(busData);
        
        this.showAlert(`Found bus ${busNumber} - ${busData.route_name}`, 'success');
    }

    displayDistrictBuses(routesData) {
        const routeDetails = document.getElementById('routeDetails');
        if (!routeDetails) return;
        
        let html = '<div class="alert alert-info"><h6><i class="fas fa-info-circle"></i> Available Buses in District:</h6>';
        
        if (Object.keys(routesData).length === 0) {
            html += '<p>No buses found for this district.</p>';
        } else {
            Object.keys(routesData).forEach(routeId => {
                const route = routesData[routeId];
                html += `
                    <div class="mb-3 p-3 border rounded">
                        <h6 class="text-primary">${route.route_name}</h6>
                        <p class="mb-2"><strong>Buses:</strong> ${route.bus_numbers.join(', ')}</p>
                        <div class="btn-group" role="group">
                            ${route.bus_numbers.map(busNum => 
                                `<button class="btn btn-sm btn-outline-primary" onclick="busTracker.selectBus('${busNum}')">${busNum}</button>`
                            ).join('')}
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div>';
        routeDetails.innerHTML = html;
        
        // Hide bus info panel when showing district buses
        const busInfo = document.getElementById('busInfo');
        if (busInfo) {
            busInfo.classList.add('d-none');
        }
    }

    selectBus(busNumber) {
        document.getElementById('busNumber').value = busNumber;
        document.getElementById('districtSelect').value = '';
        this.searchBus();
    }

    updateTrackingButtons(busData) {
        const trackBtn = document.getElementById('trackBtn');
        const stopBtn = document.getElementById('stopBtn');
        const viewBtn = document.getElementById('viewBtn');
        
        if (!trackBtn || !stopBtn || !viewBtn) return;
        
        // Check if tracking is at capacity
        const isAtCapacity = busData.tracker_count >= busData.max_trackers;
        
        if (this.isTracking) {
            trackBtn.classList.add('d-none');
            stopBtn.classList.remove('d-none');
        } else {
            trackBtn.classList.remove('d-none');
            stopBtn.classList.add('d-none');
            
            if (isAtCapacity) {
                trackBtn.disabled = true;
                trackBtn.innerHTML = '<i class="fas fa-users"></i> Max Trackers Reached';
            } else {
                trackBtn.disabled = false;
                trackBtn.innerHTML = '<i class="fas fa-play"></i> Start Tracking';
            }
        }
    }

    updateRouteDetails(busData) {
        const routeDetails = document.getElementById('routeDetails');
        if (!routeDetails) return;
        
        routeDetails.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-route text-primary"></i> ${busData.route_name}</h6>
                    <p><strong>Current Location:</strong><br>${busData.current_location || 'Unknown'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Status:</strong> <span class="badge ${busData.status === 'tracking' ? 'bg-success' : 'bg-secondary'}">${busData.status}</span></p>
                    <p><strong>Active Trackers:</strong> ${busData.tracker_count}/${busData.max_trackers}</p>
                </div>
            </div>
            <div class="mt-2">
                <small class="text-muted">
                    <i class="fas fa-info-circle"></i> 
                    ${busData.status === 'tracking' ? 'Bus is being tracked by passengers' : 'No active tracking'}
                </small>
            </div>
        `;
    }

    async startTracking() {
        if (!this.currentBus) {
            this.showAlert('Please select a bus first', 'warning');
            return;
        }
        
        if (!navigator.geolocation) {
            this.showAlert('Geolocation is not supported by this browser', 'danger');
            return;
        }
        
        // Check permissions
        if (!await this.checkLocationPermission()) {
            this.showAlert('Location permission is required for tracking', 'warning');
            return;
        }
        
        this.showLoading(true, 'Starting tracking...');
        
        try {
            const response = await fetch('/api/start_tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bus_number: this.currentBus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.trackerId = data.tracker_id;
                this.isTracking = true;
                
                this.startLocationTracking();
                this.updateTrackingButtons({ tracker_count: 1, max_trackers: 4 });
                
                this.showAlert('Started tracking! Your location is now being shared with other students.', 'success');
            } else {
                this.showAlert(data.error || 'Failed to start tracking', 'danger');
            }
        } catch (error) {
            console.error('Error starting tracking:', error);
            this.showAlert('Error starting tracking. Please try again.', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async stopTracking() {
        if (!this.trackerId) return;
        
        this.showLoading(true, 'Stopping tracking...');
        
        try {
            const response = await fetch('/api/stop_tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracker_id: this.trackerId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.stopLocationTracking();
                this.trackerId = null;
                this.isTracking = false;
                
                this.updateTrackingButtons({ tracker_count: 0, max_trackers: 4 });
                
                this.showAlert('Stopped tracking successfully', 'info');
            }
        } catch (error) {
            console.error('Error stopping tracking:', error);
            this.showAlert('Error stopping tracking', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async checkLocationPermission() {
        try {
            const permission = await navigator.permissions.query({ name: 'geolocation' });
            return permission.state === 'granted' || permission.state === 'prompt';
        } catch (error) {
            // Fallback: try to get location
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    () => resolve(true),
                    () => resolve(false),
                    { timeout: 5000 }
                );
            });
        }
    }

    startLocationTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                this.updateLocationOnServer(lat, lng, accuracy);
                this.updateMapLocation(lat, lng, true);
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.handleLocationError(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    }

    stopLocationTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.locationUpdateInterval) {
            clearInterval(this.locationUpdateInterval);
            this.locationUpdateInterval = null;
        }
    }

    handleLocationError(error) {
        let message = 'Location error occurred';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied. Please enable location access.';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location information unavailable. Please check your GPS.';
                break;
            case error.TIMEOUT:
                message = 'Location request timed out. Retrying...';
                break;
        }
        
        this.showAlert(message, 'warning');
    }

    async updateLocationOnServer(lat, lng, accuracy) {
        if (!this.trackerId) return;
        
        try {
            await fetch('/api/update_location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tracker_id: this.trackerId,
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error updating location:', error);
        }
    }

    updateMapLocation(lat, lng, isLive = false) {
        this.updateMapPlaceholder('', true, lat, lng);
        
        // Add distance to college if available
        if (this.config.collegeLocation) {
            const distance = this.calculateDistance(
                lat, lng,
                this.config.collegeLocation.lat, 
                this.config.collegeLocation.lng
            );
            
            const mapElement = document.getElementById('map');
            if (mapElement) {
                const distanceInfo = document.createElement('div');
                distanceInfo.className = 'position-absolute bottom-0 start-0 m-2 p-2 bg-white rounded shadow-sm';
                distanceInfo.innerHTML = `
                    <small class="text-muted">
                        <i class="fas fa-graduation-cap"></i> ${distance.toFixed(1)} km to SVEC
                    </small>
                `;
                mapElement.style.position = 'relative';
                mapElement.appendChild(distanceInfo);
            }
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    async viewBus() {
        if (!this.currentBus) {
            this.showAlert('Please select a bus first', 'warning');
            return;
        }
        
        this.showLoading(true, 'Fetching bus location...');
        
        try {
            const response = await fetch(`/api/bus/${this.currentBus}`);
            const data = await response.json();
            
            if (data.current_lat && data.current_lng) {
                this.updateMapLocation(data.current_lat, data.current_lng, false);
                this.showAlert('Bus location updated on map', 'success');
            } else {
                this.showAlert('No location data available for this bus', 'info');
            }
        } catch (error) {
            console.error('Error fetching bus location:', error);
            this.showAlert('Error fetching bus location', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            if (this.currentBus && !this.isTracking) {
                this.refreshBusInfo();
            }
        }, this.config.autoRefreshFrequency);
    }

    async refreshBusInfo() {
        if (!this.currentBus) return;
        
        try {
            const response = await fetch(`/api/bus/${this.currentBus}`);
            const data = await response.json();
            this.displayBusInfo(this.currentBus, data);
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const busParam = urlParams.get('bus');
        
        if (busParam) {
            const busNumberInput = document.getElementById('busNumber');
            if (busNumberInput) {
                busNumberInput.value = busParam;
                setTimeout(() => this.searchBus(), 100);
            }
        }
    }

    setupCleanup() {
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (this.trackerId) {
                navigator.sendBeacon('/api/stop_tracking', JSON.stringify({
                    tracker_id: this.trackerId
                }));
            }
        });

        // Clean up intervals on page unload
        window.addEventListener('unload', () => {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
            if (this.locationUpdateInterval) {
                clearInterval(this.locationUpdateInterval);
            }
        });
    }

    showLoading(show, message = 'Loading...') {
        let loadingElement = document.getElementById('loadingOverlay');
        
        if (show) {
            if (!loadingElement) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'loadingOverlay';
                loadingElement.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
                loadingElement.style.cssText = 'background: rgba(0,0,0,0.5); z-index: 9999;';
                document.body.appendChild(loadingElement);
            }
            
            loadingElement.innerHTML = `
                <div class="bg-white p-4 rounded shadow">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 mb-0">${message}</p>
                    </div>
                </div>
            `;
        } else {
            if (loadingElement) {
                loadingElement.remove();
            }
        }
    }

    showAlert(message, type = 'info') {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert.auto-dismiss');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show auto-dismiss`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of container
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
}

// Global functions for backward compatibility
function searchBus() {
    if (window.busTracker) {
        window.busTracker.searchBus();
    }
}

function startTracking() {
    if (window.busTracker) {
        window.busTracker.startTracking();
    }
}

function stopTracking() {
    if (window.busTracker) {
        window.busTracker.stopTracking();
    }
}

function viewBus() {
    if (window.busTracker) {
        window.busTracker.viewBus();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    window.busTracker = new SVECBusTracker();
    
    console.log('SVEC Bus Tracker initialized successfully');
});