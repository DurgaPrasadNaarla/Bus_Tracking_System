// SVEC Bus Tracker - Main JavaScript Functions
// Core functionality for the bus tracking system

class SVECBusTracker {
    constructor() {
        this.currentBus = null;
        this.trackerId = null;
        this.watchId = null;
        this.map = null;
        this.busMarker = null;
        this.allBusesData = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchBus();
                }
            });
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (this.trackerId) {
                navigator.sendBeacon('/api/stop_tracking', JSON.stringify({tracker_id: this.trackerId}));
            }
        });
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/buses');
            const buses = await response.json();
            this.updateStatistics(buses);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    updateStatistics(buses) {
        const totalBusesElement = document.getElementById('totalBuses');
        const activeBusesElement = document.getElementById('activeBuses');
        
        if (totalBusesElement) {
            totalBusesElement.textContent = buses.length;
        }
        
        // For now, set active buses to 0 - this would be calculated from actual tracking data
        if (activeBusesElement) {
            activeBusesElement.textContent = '0';
        }
    }

    // Search functionality
    async searchBus() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.trim() : '';
        
        if (!query) {
            this.showAlert('Please enter a search term', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            this.displaySearchResults(data);
        } catch (error) {
            console.error('Search error:', error);
            this.showAlert('Error searching buses', 'danger');
        }
    }

    displaySearchResults(buses) {
        const resultsDiv = document.getElementById('searchResults');
        if (!resultsDiv) return;
        
        if (buses.length === 0) {
            resultsDiv.innerHTML = '<div class="alert alert-info">No buses found matching your search.</div>';
            return;
        }
        
        let html = '<div class="mt-3"><h6>Search Results:</h6>';
        buses.forEach(bus => {
            html += `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <strong>${bus.bus_number}</strong>
                            </div>
                            <div class="col-md-5">
                                <small>${bus.route_name}</small>
                            </div>
                            <div class="col-md-2">
                                <span class="badge ${bus.status === 'tracking' ? 'bg-success' : 'bg-secondary'}">
                                    ${bus.status}
                                </span>
                            </div>
                            <div class="col-md-2">
                                <a href="/track?bus=${bus.bus_number}" class="btn btn-sm btn-primary">Track</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        resultsDiv.innerHTML = html;
    }

    // Bus tracking functionality
    async searchBusForTracking() {
        const busNumber = document.getElementById('busNumber')?.value.trim();
        const district = document.getElementById('districtSelect')?.value;
        
        if (!busNumber && !district) {
            this.showAlert('Please enter a bus number or select a district', 'warning');
            return;
        }
        
        try {
            const url = busNumber ? `/api/bus/${busNumber}` : `/api/routes/${district}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (busNumber) {
                this.displayBusInfo(busNumber, data);
            } else {
                this.displayDistrictBuses(data);
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Bus not found or error occurred', 'danger');
        }
    }

    displayBusInfo(busNumber, busData) {
        this.currentBus = busNumber;
        
        const busDetails = document.getElementById('busDetails');
        const routeInfo = document.getElementById('routeInfo');
        const busStatus = document.getElementById('busStatus');
        const busInfo = document.getElementById('busInfo');
        
        if (busDetails) busDetails.textContent = `Bus: ${busNumber}`;
        if (routeInfo) routeInfo.textContent = busData.route_name;
        
        const statusBadge = busData.status === 'tracking' ? 
            '<span class="badge bg-success">Live Tracking</span>' : 
            '<span class="badge bg-secondary">Stopped</span>';
        
        if (busStatus) {
            busStatus.innerHTML = `
                <p>Status: ${statusBadge}</p>
                <p>Trackers: ${busData.tracker_count}/${busData.max_trackers}</p>
                <p>Last Updated: ${new Date(busData.last_updated).toLocaleTimeString()}</p>
            `;
        }
        
        if (busInfo) {
            busInfo.classList.remove('d-none');
        }
        
        // Update map if bus has location
        if (busData.current_lat && busData.current_lng) {
            this.updateMapLocation(busData.current_lat, busData.current_lng);
        }
        
        // Update route details
        this.updateRouteDetails(busData);
    }

    displayDistrictBuses(routesData) {
        const routeDetails = document.getElementById('routeDetails');
        if (!routeDetails) return;
        
        let html = '<h6>Available Buses:</h6>';
        
        Object.keys(routesData).forEach(routeId => {
            const route = routesData[routeId];
            html += `<div class="mb-2">
                <strong>${route.route_name}</strong><br>
                <small>Buses: ${route.bus_numbers.join(', ')}</small>
            </div>`;
        });
        
        routeDetails.innerHTML = html;
    }

    updateRouteDetails(busData) {
        const routeDetails = document.getElementById('routeDetails');
        if (!routeDetails) return;
        
        routeDetails.innerHTML = `
            <h6><i class="fas fa-route"></i> ${busData.route_name}</h6>
            <p><strong>Current Location:</strong> ${busData.current_location || 'Unknown'}</p>
            <p><strong>Status:</strong> ${busData.status}</p>
            <p><strong>Last Updated:</strong> ${new Date(busData.last_updated).toLocaleString()}</p>
        `;
    }

    // Location tracking functionality
    async startTracking() {
        if (!this.currentBus) {
            this.showAlert('Please select a bus first', 'warning');
            return;
        }
        
        if (!navigator.geolocation) {
            this.showAlert('Geolocation is not supported by this browser', 'danger');
            return;
        }
        
        try {
            const response = await fetch('/api/start_tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bus_number: this.currentBus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.trackerId = data.tracker_id;
                this.startLocationTracking();
                
                const trackBtn = document.getElementById('trackBtn');
                const stopBtn = document.getElementById('stopBtn');
                
                if (trackBtn) trackBtn.classList.add('d-none');
                if (stopBtn) stopBtn.classList.remove('d-none');
                
                this.showAlert('Started tracking! Your location is now being shared.', 'success');
            } else {
                this.showAlert(data.error || 'Failed to start tracking', 'danger');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error starting tracking', 'danger');
        }
    }

    async stopTracking() {
        if (!this.trackerId) return;
        
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
                
                const trackBtn = document.getElementById('trackBtn');
                const stopBtn = document.getElementById('stopBtn');
                
                if (trackBtn) trackBtn.classList.remove('d-none');
                if (stopBtn) stopBtn.classList.add('d-none');
                
                this.showAlert('Stopped tracking', 'info');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error stopping tracking', 'danger');
        }
    }

    startLocationTracking() {
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                this.updateLocationOnServer(lat, lng);
                this.updateMapLocation(lat, lng);
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showAlert('Location tracking error', 'warning');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }

    stopLocationTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }

    async updateLocationOnServer(lat, lng) {
        if (!this.trackerId) return;
        
        try {
            await fetch('/api/update_location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tracker_id: this.trackerId,
                    latitude: lat,
                    longitude: lng
                })
            });
        } catch (error) {
            console.error('Error updating location:', error);
        }
    }

    updateMapLocation(lat, lng) {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        // Simple map placeholder for demo
        // In production, this would integrate with Google Maps or Leaflet
        mapElement.innerHTML = `
            <div class="d-flex align-items-center justify-content-center h-100 bg-light">
                <div class="text-center">
                    <i class="fas fa-map-marker-alt fa-3x text-primary mb-3"></i>
                    <p class="text-primary"><strong>Bus Location</strong></p>
                    <p class="text-muted">Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</p>
                    <small class="text-muted">Live tracking active</small>
                </div>
            </div>
        `;
    }

    async viewBus() {
        if (!this.currentBus) {
            this.showAlert('Please select a bus first', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`/api/bus/${this.currentBus}`);
            const data = await response.json();
            
            if (data.current_lat && data.current_lng) {
                this.updateMapLocation(data.current_lat, data.current_lng);
            } else {
                this.showAlert('No location data available for this bus', 'info');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('Error fetching bus location', 'danger');
        }
    }

    // Auto-refresh functionality
    startAutoRefresh() {
        setInterval(() => {
            if (this.currentBus && !this.trackerId) {
                this.refreshBusInfo();
            }
        }, 30000); // Refresh every 30 seconds
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

    // Utility functions
    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of main content
        const main = document.querySelector('main');
        if (main) {
            main.insertBefore(alertDiv, main.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }

    // Handle URL parameters
    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const busParam = urlParams.get('bus');
        
        if (busParam) {
            const busNumberInput = document.getElementById('busNumber');
            if (busNumberInput) {
                busNumberInput.value = busParam;
                this.searchBusForTracking();
            }
        }
    }
}

// Global functions for backward compatibility
function searchBus() {
    if (window.busTracker) {
        window.busTracker.searchBus();
    }
}

function searchBusForTracking() {
    if (window.busTracker) {
        window.busTracker.searchBusForTracking();
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.busTracker = new SVECBusTracker();
    
    // Start auto-refresh
    window.busTracker.startAutoRefresh();
    
    // Handle URL parameters
    window.busTracker.handleURLParams();
    
    // Initialize map placeholder
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="d-flex align-items-center justify-content-center h-100 bg-light">
                <div class="text-center">
                    <i class="fas fa-map fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Map will show here<br><small>Select a bus to view location</small></p>
                </div>
            </div>
        `;
    }
});