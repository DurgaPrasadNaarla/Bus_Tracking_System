// SVEC Bus Tracker - Routes Page JavaScript
// Handles route filtering, display, and management

class RoutesManager {
    constructor() {
        this.allRoutesData = {};
        this.currentFilter = 'all';
        this.searchTimeout = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAllRoutes();
        this.setupSearch();
    }

    bindEvents() {
        // Add event listeners for filter buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick*="filterRoutes"]')) {
                e.preventDefault();
                const district = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.filterRoutes(district);
            }
        });

        // Add event listener for route card interactions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.expand-stops-btn')) {
                e.preventDefault();
                this.toggleStopsExpansion(e.target);
            }
        });
    }

    setupSearch() {
        // Add search functionality
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'form-control mb-3';
        searchInput.placeholder = 'Search routes, stops, or bus numbers...';
        searchInput.id = 'routeSearch';

        const searchContainer = document.createElement('div');
        searchContainer.className = 'col-12 mb-3';
        searchContainer.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="fas fa-search"></i>
                        </span>
                        <input type="text" class="form-control" placeholder="Search routes, stops, or bus numbers..." id="routeSearch">
                        <button class="btn btn-outline-secondary" type="button" onclick="routesManager.clearSearch()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Insert search before the filter buttons
        const firstRow = document.querySelector('.row.mb-4');
        if (firstRow) {
            firstRow.parentNode.insertBefore(searchContainer, firstRow);
        }

        // Add search event listener
        document.getElementById('routeSearch').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.searchRoutes(e.target.value);
            }, 300);
        });
    }

    async loadAllRoutes() {
        try {
            const response = await fetch('/api/routes');
            const data = await response.json();
            this.allRoutesData = data;
            this.displayRoutes(data);
            this.updateButtonCounts();
        } catch (error) {
            console.error('Error loading routes:', error);
            this.showError('Error loading routes. Please try again later.');
        }
    }

    async filterRoutes(district) {
        try {
            // Update button states
            this.updateButtonStates(district);
            
            if (district === 'all') {
                this.displayRoutes(this.allRoutesData);
            } else {
                const response = await fetch(`/api/routes/${district}`);
                const data = await response.json();
                this.displayRoutes(data);
            }
            
            this.currentFilter = district;
            this.clearSearch();
        } catch (error) {
            console.error('Error filtering routes:', error);
            this.showError('Error filtering routes. Please try again.');
        }
    }

    searchRoutes(searchTerm) {
        if (!searchTerm.trim()) {
            this.displayRoutes(this.allRoutesData);
            return;
        }

        const filteredRoutes = {};
        const term = searchTerm.toLowerCase();

        Object.keys(this.allRoutesData).forEach(routeId => {
            const route = this.allRoutesData[routeId];
            
            // Search in route name, stops, and bus numbers
            const matchesRoute = route.route_name.toLowerCase().includes(term);
            const matchesStops = route.stops.some(stop => stop.toLowerCase().includes(term));
            const matchesBuses = route.bus_numbers.some(bus => bus.toLowerCase().includes(term));
            const matchesDistrict = route.district.toLowerCase().includes(term);
            const matchesLocations = route.start_location.toLowerCase().includes(term) || 
                                   route.end_location.toLowerCase().includes(term);
            
            if (matchesRoute || matchesStops || matchesBuses || matchesDistrict || matchesLocations) {
                filteredRoutes[routeId] = route;
            }
        });

        this.displayRoutes(filteredRoutes);
    }

    clearSearch() {
        const searchInput = document.getElementById('routeSearch');
        if (searchInput) {
            searchInput.value = '';
        }
        this.filterRoutes(this.currentFilter);
    }

    updateButtonStates(activeDistrict) {
        // Remove active state from all buttons
        document.querySelectorAll('button[id$="Btn"]').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline-primary');
        });
        
        // Add active state to selected button
        let btnId;
        switch(activeDistrict) {
            case 'all':
                btnId = 'allBtn';
                break;
            case 'west godavari':
                btnId = 'wgBtn';
                break;
            case 'east godavari':
                btnId = 'egBtn';
                break;
            case 'eluru':
                btnId = 'elBtn';
                break;
        }
        
        const activeBtn = document.getElementById(btnId);
        if (activeBtn) {
            activeBtn.classList.remove('btn-outline-primary');
            activeBtn.classList.add('btn-primary');
        }
    }

    updateButtonCounts() {
        const counts = this.calculateRouteCounts();
        
        // Update button texts with counts
        const buttons = {
            allBtn: `<i class="fas fa-list"></i> All Routes (${counts.total} buses)`,
            wgBtn: `<i class="fas fa-map-marker-alt"></i> West Godavari (${counts.westGodavari})`,
            egBtn: `<i class="fas fa-map-marker-alt"></i> East Godavari (${counts.eastGodavari})`,
            elBtn: `<i class="fas fa-map-marker-alt"></i> Eluru (${counts.eluru})`
        };

        Object.keys(buttons).forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.innerHTML = buttons[btnId];
            }
        });
    }

    calculateRouteCounts() {
        const counts = {
            total: 0,
            westGodavari: 0,
            eastGodavari: 0,
            eluru: 0
        };

        Object.values(this.allRoutesData).forEach(route => {
            const busCount = route.bus_numbers.length;
            counts.total += busCount;
            
            switch(route.district.toLowerCase()) {
                case 'west godavari':
                    counts.westGodavari += busCount;
                    break;
                case 'east godavari':
                    counts.eastGodavari += busCount;
                    break;
                case 'eluru':
                    counts.eluru += busCount;
                    break;
            }
        });

        return counts;
    }

    displayRoutes(routesData) {
        const container = document.getElementById('routesContainer');
        if (!container) return;
        
        if (Object.keys(routesData).length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <h5>No routes found</h5>
                    <p>Try adjusting your search terms or filters.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Sort routes by district and then by route name
        const sortedRoutes = Object.keys(routesData).sort((a, b) => {
            const routeA = routesData[a];
            const routeB = routesData[b];
            
            if (routeA.district !== routeB.district) {
                return routeA.district.localeCompare(routeB.district);
            }
            return routeA.route_name.localeCompare(routeB.route_name);
        });
        
        sortedRoutes.forEach(routeId => {
            const route = routesData[routeId];
            html += this.createRouteCard(route);
        });
        
        container.innerHTML = html;
        this.bindRouteCardEvents();
    }

    createRouteCard(route) {
        const totalBuses = route.bus_numbers.length;
        const estimatedDuration = this.calculateEstimatedDuration(route.stops.length);
        
        return `
            <div class="card mb-3 route-card" data-district="${route.district.toLowerCase()}" data-route-id="${route.route_name}">
                <div class="card-header bg-primary text-white">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-route"></i> ${route.route_name}
                        </h5>
                        <div>
                            <span class="badge bg-light text-dark me-1">${route.district}</span>
                            <span class="badge bg-warning text-dark me-1">${totalBuses} buses</span>
                            <span class="badge bg-info text-dark">${route.stops.length} stops</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            ${this.createRouteDetails(route, estimatedDuration)}
                        </div>
                        <div class="col-md-6">
                            ${this.createBusGrid(route)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createRouteDetails(route, estimatedDuration) {
        return `
            <h6><i class="fas fa-play-circle text-success"></i> Route Details</h6>
            <div class="route-info mb-3">
                <div class="row">
                    <div class="col-6">
                        <small class="text-muted">From:</small>
                        <p class="fw-bold">${route.start_location}</p>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">To:</small>
                        <p class="fw-bold">${route.end_location}</p>
                    </div>
                </div>
                <div class="row">
                    <div class="col-6">
                        <small class="text-muted">Estimated Duration:</small>
                        <p class="text-info">${estimatedDuration}</p>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">Total Stops:</small>
                        <p class="text-info">${route.stops.length}</p>
                    </div>
                </div>
            </div>
            
            <h6><i class="fas fa-map-marked-alt"></i> Bus Stops</h6>
            <div class="stops-container" data-route="${route.route_name}">
                ${this.createStopsDisplay(route.stops)}
            </div>
        `;
    }

    createStopsDisplay(stops) {
        const maxVisibleStops = 5;
        let html = '';
        
        stops.forEach((stop, index) => {
            const isHidden = index >= maxVisibleStops;
            html += `
                <div class="stop-item${isHidden ? ' d-none' : ''}" data-stop-index="${index}">
                    <span class="stop-number">${index + 1}</span>
                    <span class="stop-name">${stop}</span>
                    ${index === 0 ? '<i class="fas fa-play text-success ms-2" title="Start"></i>' : ''}
                    ${index === stops.length - 1 ? '<i class="fas fa-flag text-danger ms-2" title="End"></i>' : ''}
                </div>
            `;
        });
        
        if (stops.length > maxVisibleStops) {
            html += `
                <button class="btn btn-sm btn-outline-secondary mt-2 expand-stops-btn" data-expanded="false">
                    <i class="fas fa-chevron-down"></i> Show ${stops.length - maxVisibleStops} more stops
                </button>
            `;
        }
        
        return html;
    }

    createBusGrid(route) {
        return `
            <h6><i class="fas fa-bus"></i> Available Buses</h6>
            <div class="bus-grid mb-3">
                ${route.bus_numbers.map(busNum => this.createBusCard(busNum)).join('')}
            </div>
            
            <div class="route-actions">
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        <i class="fas fa-info-circle"></i> 
                        Click track buttons for real-time location
                    </small>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="routesManager.trackAllBuses('${route.route_name}')">
                            <i class="fas fa-eye"></i> View All
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="routesManager.showRouteMap('${route.route_name}')">
                            <i class="fas fa-map"></i> Route Map
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createBusCard(busNum) {
        return `
            <div class="bus-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="bus-info">
                        <span class="bus-number">${busNum}</span>
                        <small class="bus-status text-muted d-block" id="status-${busNum}">
                            <i class="fas fa-circle text-secondary"></i> Offline
                        </small>
                    </div>
                    <div class="bus-actions">
                        <a href="/track?bus=${busNum}" class="btn btn-sm btn-success me-1" title="Track Bus">
                            <i class="fas fa-search"></i>
                        </a>
                        <button class="btn btn-sm btn-info" onclick="routesManager.getBusInfo('${busNum}')" title="Bus Info">
                            <i class="fas fa-info"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleStopsExpansion(button) {
        const container = button.closest('.stops-container');
        const hiddenStops = container.querySelectorAll('.stop-item.d-none');
        const isExpanded = button.dataset.expanded === 'true';
        
        if (isExpanded) {
            // Collapse
            hiddenStops.forEach(stop => stop.classList.add('d-none'));
            button.innerHTML = `<i class="fas fa-chevron-down"></i> Show ${hiddenStops.length} more stops`;
            button.dataset.expanded = 'false';
        } else {
            // Expand
            hiddenStops.forEach(stop => stop.classList.remove('d-none'));
            button.innerHTML = '<i class="fas fa-chevron-up"></i> Show less';
            button.dataset.expanded = 'true';
        }
    }

    bindRouteCardEvents() {
        // Add hover effects
        document.querySelectorAll('.route-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                this.style.transition = 'all 0.3s ease';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });

        // Update bus statuses
        this.updateBusStatuses();
    }

    async updateBusStatuses() {
        try {
            const response = await fetch('/api/buses/status');
            const statusData = await response.json();
            
            Object.keys(statusData).forEach(busNumber => {
                const statusElement = document.getElementById(`status-${busNumber}`);
                if (statusElement) {
                    const status = statusData[busNumber];
                    const isOnline = status.status === 'tracking';
                    
                    statusElement.innerHTML = `
                        <i class="fas fa-circle ${isOnline ? 'text-success' : 'text-secondary'}"></i>
                        ${isOnline ? 'Online' : 'Offline'}
                    `;
                }
            });
        } catch (error) {
            console.error('Error updating bus statuses:', error);
        }
    }

    calculateEstimatedDuration(stopCount) {
        // Estimate 3 minutes per stop + 5 minutes base time
        const minutes = (stopCount * 3) + 5;
        if (minutes < 60) {
            return `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        }
    }

    async getBusInfo(busNumber) {
        try {
            const response = await fetch(`/api/bus/${busNumber}`);
            const data = await response.json();
            this.showBusInfoModal(busNumber, data);
        } catch (error) {
            console.error('Error fetching bus info:', error);
            this.showError('Error fetching bus information');
        }
    }

    showBusInfoModal(busNumber, busData) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'busInfoModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-bus"></i> Bus ${busNumber} Information
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6><i class="fas fa-route"></i> Route Information</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Route:</strong></td>
                                        <td>${busData.route_name}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>District:</strong></td>
                                        <td>${busData.district}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Current Location:</strong></td>
                                        <td>${busData.current_location || 'Not available'}</td>
                                    </tr>
                                </table>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fas fa-info-circle"></i> Status</h6>
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Status:</strong></td>
                                        <td>
                                            <span class="badge ${busData.status === 'tracking' ? 'bg-success' : 'bg-secondary'}">
                                                ${busData.status || 'Unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td><strong>Active Trackers:</strong></td>
                                        <td>${busData.tracker_count || 0}/${busData.max_trackers || 4}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Last Updated:</strong></td>
                                        <td>${busData.last_updated ? new Date(busData.last_updated).toLocaleString() : 'Never'}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        ${busData.current_lat && busData.current_lng ? `
                            <div class="mt-3">
                                <h6><i class="fas fa-map-marker-alt"></i> Current Position</h6>
                                <p class="text-muted">Latitude: ${busData.current_lat}, Longitude: ${busData.current_lng}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <a href="/track?bus=${busNumber}" class="btn btn-primary">
                            <i class="fas fa-search"></i> Track This Bus
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Remove modal from DOM when hidden
        modal.addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modal);
        });
    }

    trackAllBuses(routeName) {
        // Show modal with all buses for this route
        const routeData = Object.values(this.allRoutesData).find(route => route.route_name === routeName);
        if (!routeData) return;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-eye"></i> Track All Buses - ${routeName}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            ${routeData.bus_numbers.map(busNum => `
                                <div class="col-md-4 mb-3">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h6 class="card-title">Bus ${busNum}</h6>
                                            <div id="bus-status-${busNum}" class="mb-2">
                                                <span class="badge bg-secondary">Loading...</span>
                                            </div>
                                            <a href="/track?bus=${busNum}" class="btn btn-primary btn-sm">
                                                <i class="fas fa-search"></i> Track
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Load individual bus statuses
        routeData.bus_numbers.forEach(busNum => {
            this.loadBusStatus(busNum);
        });
        
        modal.addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modal);
        });
    }

    async loadBusStatus(busNumber) {
        try {
            const response = await fetch(`/api/bus/${busNumber}`);
            const data = await response.json();
            const statusElement = document.getElementById(`bus-status-${busNumber}`);
            
            if (statusElement) {
                const isTracking = data.status === 'tracking';
                statusElement.innerHTML = `
                    <span class="badge ${isTracking ? 'bg-success' : 'bg-secondary'}">
                        ${isTracking ? 'Online' : 'Offline'}
                    </span>
                    <br>
                    <small class="text-muted">
                        Trackers: ${data.tracker_count || 0}/${data.max_trackers || 4}
                    </small>
                `;
            }
        } catch (error) {
            console.error(`Error loading status for bus ${busNumber}:`, error);
        }
    }

    showRouteMap(routeName) {
        // Show route map modal
        const routeData = Object.values(this.allRoutesData).find(route => route.route_name === routeName);
        if (!routeData) return;

        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-map"></i> Route Map - ${routeName}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-4">
                                <h6>Route Details</h6>
                                <p><strong>From:</strong> ${routeData.start_location}</p>
                                <p><strong>To:</strong> ${routeData.end_location}</p>
                                <p><strong>District:</strong> ${routeData.district}</p>
                                
                                <h6>All Stops</h6>
                                <div class="stops-list" style="max-height: 300px; overflow-y: auto;">
                                    ${routeData.stops.map((stop, index) => `
                                        <div class="stop-item-map">
                                            <span class="stop-number">${index + 1}</span>
                                            <span class="stop-name">${stop}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="col-md-8">
                                <div id="route-map" class="bg-light d-flex align-items-center justify-content-center" style="height: 400px;">
                                    <div class="text-center">
                                        <i class="fas fa-map fa-3x text-muted mb-3"></i>
                                        <p class="text-muted">Interactive route map will be displayed here</p>
                                        <small>Google Maps integration required</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        modal.addEventListener('hidden.bs.modal', function() {
            document.body.removeChild(modal);
        });
    }

    showError(message) {
        const container = document.getElementById('routesContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message}
                </div>
            `;
        }
    }

    // Auto-refresh functionality
    startAutoRefresh() {
        setInterval(() => {
            this.updateBusStatuses();
        }, 30000); // Refresh every 30 seconds
    }
}

// Initialize the routes manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.routesManager = new RoutesManager();
    routesManager.startAutoRefresh();
});

// Utility functions for the global scope
function filterRoutes(district) {
    if (window.routesManager) {
        window.routesManager.filterRoutes(district);
    }
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoutesManager;
}