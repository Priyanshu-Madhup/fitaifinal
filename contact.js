/**
 * FitAi - Contact Page TomTom Map Implementation
 * This file provides map functionality for the contact.html page
 */

// Debug information
console.log('contact.js loaded');

// Get TomTom API key from config with fallback mechanism for Vercel
const TOM_TOM_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.tomtom) || 
    (typeof window !== 'undefined' && window.__env && window.__env.TOMTOM_API_KEY) ||
    'JXPnqva3lZanMKstFTttkppZnHor4IXr'; // Fallback for debugging only

console.log('Using TOM_TOM_API_KEY for contact map:', TOM_TOM_API_KEY);

// Global variables
let contactMap = null;
let officeMarker = null;

// Office location coordinates (Sri Nivasa Reddy Layout, AECS Layout, Marathahalli, Bengaluru)
const OFFICE_LOCATION = {
    coordinates: [77.7139464, 12.9674828], // [longitude, latitude]
    name: "FitAi Headquarters",
    address: "Sri Nivasa Reddy Layout, AECS Layout, Marathahalli, Bengaluru, Karnataka - 560037, India"
};

/**
 * Initialize the contact page map
 */
function initializeContactMap() {
    console.log('Initializing contact map...');
    
    // Check if map container exists
    const mapContainer = document.getElementById('contact-map-container');
    if (!mapContainer) {
        console.error('Contact map container not found');
        return;
    }
    
    // Check if TomTom is available
    if (typeof tt === 'undefined') {
        console.error('TomTom SDK not loaded');
        mapContainer.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded">TomTom SDK failed to load. Please check your internet connection.</div>';
        return;
    }
    
    try {
        // Clear the map container first to ensure clean initialization
        mapContainer.innerHTML = '';
        
        // Create the map with office location as center
        contactMap = tt.map({
            key: TOM_TOM_API_KEY,
            container: 'contact-map-container',
            center: OFFICE_LOCATION.coordinates,
            zoom: 15,
            stylesVisibility: {
                poi: true,  // Show points of interest
                trafficIncidents: false,
                trafficFlow: false
            }
        });
        
        console.log('Contact map created successfully');
        
        // Add essential map controls
        contactMap.addControl(new tt.NavigationControl());
        contactMap.addControl(new tt.FullscreenControl());
        
        // Listen for map load event
        contactMap.on('load', function() {
            console.log('Contact map fully loaded');
            
            // Add office marker
            addOfficeMarker();
            
            // Force resize to ensure proper display
            window.dispatchEvent(new Event('resize'));
        });
        
        // Listen for error events
        contactMap.on('error', function(error) {
            console.error('Contact map error:', error);
        });
        
    } catch (error) {
        console.error('Error creating contact map:', error);
        mapContainer.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded">
                <p class="font-bold">Error creating map</p>
                <p>${error.message}</p>
                <p class="text-sm mt-2">Please try refreshing the page or check your internet connection.</p>
            </div>
        `;
    }
}

/**
 * Add office marker to the map
 */
function addOfficeMarker() {
    if (!contactMap) {
        console.error('Contact map not initialized');
        return;
    }
    
    try {
        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'office-marker';
        markerElement.innerHTML = `
            <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-lg flex items-center justify-center border-4 border-white animate-pulse">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
            </div>
        `;
        
        // Create marker
        officeMarker = new tt.Marker({
            element: markerElement,
            anchor: 'center'
        })
        .setLngLat(OFFICE_LOCATION.coordinates)
        .addTo(contactMap);
          // Create popup for the office marker
        const popup = new tt.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false
        }).setHTML(`
            <div class="p-3 max-w-xs">
                <h3 class="font-bold text-lg text-gray-800 mb-2">${OFFICE_LOCATION.name}</h3>
                <p class="text-gray-600 text-sm mb-3">${OFFICE_LOCATION.address}</p>
                <a href="https://www.google.com/maps/dir//Sri+Nivasa+Reddy+Layout,+AECS+Layout,+Marathahalli,+Bengaluru,+Karnataka+560037/@12.9674698,77.6315445,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bae130f321b2b95:0x74b2c05bbc2aac8d!2m2!1d77.7139464!2d12.9674828?entry=ttu&g_ep=EgoyMDI1MDYwNC4wIKXMDSoASAFQAw%3D%3D" 
                   target="_blank" 
                   class="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    Directions
                </a>
            </div>
        `);
        
        // Attach popup to marker
        officeMarker.setPopup(popup);
        
        // Show popup after a short delay
        setTimeout(() => {
            popup.addTo(contactMap);
        }, 1000);
        
        console.log('Office marker added successfully');
        
    } catch (error) {
        console.error('Error adding office marker:', error);
    }
}

/**
 * Mobile menu functionality
 */
function setupMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Contact page DOM content loaded');
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Wait until everything is fully loaded before initializing map
    window.addEventListener('load', function() {
        console.log('Contact page window fully loaded - initializing map');
        // Small delay to ensure DOM is completely rendered
        setTimeout(function() {
            initializeContactMap();
        }, 100);
    });
});

// Handle window resize
window.addEventListener('resize', function() {
    if (contactMap) {
        contactMap.getCanvas().resize();
    }
});
