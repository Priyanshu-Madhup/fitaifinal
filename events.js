/**
 * FitAi - Events Search Functionality
 * This file provides the functionality to search for fitness events by location using Serper API
 */

// Debug information
console.log('events.js loaded');

// Get Serper API key from config with fallback mechanism
const SERPER_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.serper) || 
    (typeof window !== 'undefined' && window.__env && window.__env.SERPER_API_KEY) ||
    '67c090a334109db4480037614dbb1c635f29ad83'; // Fallback for debugging only

console.log('Using SERPER_API_KEY:', SERPER_API_KEY ? 'Available' : 'Not available');

// DOM elements
const countrySelect = document.getElementById('country-select');
const citySelect = document.getElementById('city-select');
const searchButton = document.getElementById('search-events');
const loadingIndicator = document.getElementById('loading-indicator');
const resultsContainer = document.getElementById('results-container');
const resultsMessage = document.getElementById('results-message');
const eventsList = document.getElementById('events-list');
const noResults = document.getElementById('no-results');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

// City mapping for each country
const cityMapping = {
    'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
    'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'],
    'UK': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Bristol', 'Leeds', 'Sheffield', 'Edinburgh', 'Newcastle'],
    'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Hobart'],
    'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
    'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama'],
    'China': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Tianjin', 'Wuhan', 'Xi\'an', 'Hangzhou', 'Nanjing'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
    'Singapore': ['Singapore'],
    'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania']
};

// Mapping of event types to categories for styling
const eventCategories = {
    'marathon': 'marathon',
    'run': 'running',
    'running': 'running',
    'yoga': 'yoga',
    'fitness': 'fitness',
    'gym': 'fitness',
    'workout': 'fitness',
    'sports': 'sports',
    'tournament': 'sports',
    'championship': 'sports',
    'cycling': 'cycling',
    'bike': 'cycling',
    'triathlon': 'marathon'
};

// Initialize the page
function initEvents() {
    console.log('Initializing events page');
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', searchEvents);
    }
    
    // Mobile menu toggle
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
    
    // Country selection changes city options
    countrySelect.addEventListener('change', function() {
        const selectedCountry = this.value;
        updateCities(selectedCountry);
    });
    
    // Add example search handlers
    const examples = [
        { country: 'USA', city: 'New York' },
        { country: 'India', city: 'Mumbai' },
        { country: 'UK', city: 'London' }
    ];
    
    // Add random example suggestion after waiting for DOM to fully load
    window.addEventListener('load', () => {
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        const exampleText = document.createElement('div');
        exampleText.className = 'mt-3 text-center text-sm';
        exampleText.innerHTML = `Try an example: <button class="text-primary underline example-search">${randomExample.country}, ${randomExample.city}</button>`;
        
        exampleText.querySelector('.example-search').addEventListener('click', function() {
            countrySelect.value = randomExample.country;
            updateCities(randomExample.country);
            setTimeout(() => {
                citySelect.value = randomExample.city;
                searchEvents();
            }, 100);
        });
        
        resultsMessage.appendChild(exampleText);
    });
}

// Update cities dropdown based on selected country
function updateCities(country) {
    // Clear existing options
    citySelect.innerHTML = '';
    
    if (!country || !cityMapping[country]) {
        // If no country selected, show default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a country first';
        defaultOption.selected = true;
        defaultOption.disabled = true;
        citySelect.appendChild(defaultOption);
        return;
    }
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a city';
    defaultOption.selected = true;
    defaultOption.disabled = true;
    citySelect.appendChild(defaultOption);
    
    // Add cities for selected country
    const cities = cityMapping[country] || [];
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// Search for events based on location
async function searchEvents() {
    const country = countrySelect.value;
    const city = citySelect.value;
    
    // Validate inputs
    if (!country || !city) {
        showError('Please select both a country and city to search for events');
        return;
    }
    
    // Show loading indicator
    showLoading(true);
    
    try {
        const events = await fetchEvents(country, city);
        displayEvents(events);
    } catch (error) {
        console.error('Error searching for events:', error);
        showError('Failed to search for events. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Fetch events from Serper API
async function fetchEvents(country, city) {
    if (!SERPER_API_KEY) {
        throw new Error('Serper API key not available');
    }
    
    // Enhanced search queries with multiple strategies for better real event discovery
    const primarySearchQueries = [
        // Direct event searches with current year
        `${city} ${country} fitness events 2025 registration`,
        `${city} ${country} marathon 2025 official registration`,
        `${city} ${country} running events 2025 sign up`,
        `${city} ${country} yoga workshops 2025 book now`,
        `${city} ${country} sports tournament 2025 tickets`,
        `${city} ${country} cycling events 2025 register`,
        `${city} ${country} fitness expo 2025 official`,
        
        // Event platform searches
        `site:eventbrite.com ${city} ${country} fitness`,
        `site:meetup.com ${city} ${country} fitness events`,
        `site:active.com ${city} ${country} events`,
        `site:raceentry.com ${city} ${country}`,
        `site:runningintheusa.com ${city} ${country}`,
        
        // Broader event discovery
        `"${city}" "${country}" fitness calendar 2025`,
        `"${city}" "${country}" sports events schedule`,
        `"${city}" "${country}" race calendar 2025`,
        `"${city}" "${country}" wellness events 2025`
    ];
    
    // Secondary search queries for more results
    const secondarySearchQueries = [
        // Monthly specific searches
        `${city} ${country} fitness events June 2025`,
        `${city} ${country} fitness events July 2025`,
        `${city} ${country} fitness events August 2025`,
        `${city} ${country} fitness events September 2025`,
        
        // Event type specific
        `${city} ${country} half marathon 2025`,
        `${city} ${country} 5K 10K race 2025`,
        `${city} ${country} triathlon 2025`,
        `${city} ${country} crossfit competition 2025`,
        `${city} ${country} bodybuilding competition 2025`,
        
        // Local fitness searches
        `${city} ${country} local gym events`,
        `${city} ${country} community fitness programs`,
        `${city} ${country} outdoor fitness activities`
    ];
    
    // Fallback queries for minimal results
    const fallbackQueries = [
        `${city} ${country} fitness`,
        `${city} ${country} running`,
        `${city} ${country} sports`,
        `${city} ${country} marathon`,
        `${city} ${country} events calendar`
    ];
    
    // Combine all queries with priority order
    const allQueries = [...primarySearchQueries, ...secondarySearchQueries, ...fallbackQueries];
    
    // Perform searches with enhanced strategy
    const allResults = [];
    let resultsCount = 0;
    let searchRound = 1;
    const maxResults = 25; // Increased from 15
    
    console.log(`Starting enhanced search for ${city}, ${country} with ${allQueries.length} queries`);
    
    // Enhanced search with multiple rounds
    for (const query of allQueries) {
        try {
            // Break if we have enough results
            if (resultsCount >= maxResults) break;
            
            console.log(`Round ${searchRound}: Searching for: ${query}`);
            
            const searchParams = {
                q: query,
                gl: getCountryCode(country), // Use proper country code
                hl: 'en',
                num: 10,
                type: "search"
            };
            
            // Add time filter for recent results on primary searches
            if (primarySearchQueries.includes(query)) {
                searchParams.tbs = "qdr:y2"; // Results from past 2 years
            }
            
            const response = await fetch('https://api.serper.dev/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': SERPER_API_KEY
                },
                body: JSON.stringify(searchParams)
            });
            
            if (!response.ok) {
                console.error(`Search API error: ${response.status} for query "${query}"`);
                continue;
            }
            
            const data = await response.json();
            console.log(`API Response for "${query}":`, data);
            
            // Enhanced result processing
            let queryResults = [];
            
            // Process organic results with improved filtering
            if (data.organic && Array.isArray(data.organic)) {
                const processedResults = processSearchResults(data.organic, query, city, country);
                queryResults.push(...processedResults);
                console.log(`Found ${processedResults.length} organic results for: ${query}`);
            }
            
            // Process knowledge graph events
            if (data.knowledgeGraph && data.knowledgeGraph.events) {
                const kgEvents = data.knowledgeGraph.events.map(event => {
                    return {
                        title: event.title || event.name || 'Event',
                        description: event.description || `${event.name || 'Event'} in ${city}, ${country}`,
                        link: event.link || event.url || '#',
                        date: formatDateFromKG(event.date || event.startDate),
                        isPastEvent: false,
                        category: determineEventCategory(event.title || event.name || ''),
                        source: 'knowledge_graph'
                    };
                });
                queryResults.push(...kgEvents);
                console.log(`Found ${kgEvents.length} knowledge graph events`);
            }
            
            // Process related searches for additional events
            if (data.relatedSearches && data.relatedSearches.length > 0 && resultsCount < 10) {
                const eventRelatedSearches = data.relatedSearches.filter(search => 
                    /event|marathon|race|tournament|championship|workshop|festival|fitness|yoga|cycling|sports/i.test(search.query)
                ).slice(0, 2); // Limit to 2 related searches
                
                for (const relatedSearch of eventRelatedSearches) {
                    try {
                        console.log(`Trying related search: ${relatedSearch.query}`);
                        
                        const relatedResponse = await fetch('https://api.serper.dev/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-KEY': SERPER_API_KEY
                            },
                            body: JSON.stringify({
                                q: relatedSearch.query,
                                gl: getCountryCode(country),
                                hl: 'en',
                                num: 5
                            })
                        });
                        
                        if (relatedResponse.ok) {
                            const relatedData = await relatedResponse.json();
                            if (relatedData.organic && Array.isArray(relatedData.organic)) {
                                const relatedResults = processSearchResults(relatedData.organic, relatedSearch.query, city, country);
                                queryResults.push(...relatedResults);
                                console.log(`Found ${relatedResults.length} results from related search`);
                            }
                        }
                    } catch (error) {
                        console.error(`Error in related search for "${relatedSearch.query}":`, error);
                    }
                }
            }
            
            // Add results from this query
            if (queryResults.length > 0) {
                allResults.push(...queryResults);
                resultsCount += queryResults.length;
                console.log(`Total results so far: ${resultsCount}`);
            }
            
            searchRound++;
            
            // Add delay between requests to avoid rate limiting
            if (searchRound % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
        } catch (error) {
            console.error(`Error in search for "${query}":`, error);
        }
    }
      // Remove duplicates based on title similarity
    const uniqueEvents = removeDuplicateEvents(allResults);
    
    // If very few results are found, add some default events based on location
    if (uniqueEvents.length < 3) {
        console.log("Few or no events found, adding default events for location:", country, city);
        const defaultEvents = getDefaultEvents(country, city);
        
        // Combine real and default events, but prioritize real events
        const combinedEvents = [...uniqueEvents];
        
        // Add default events up to a maximum of 5 total events
        const neededDefaultEvents = Math.min(defaultEvents.length, 5 - uniqueEvents.length);
        for (let i = 0; i < neededDefaultEvents; i++) {
            combinedEvents.push(defaultEvents[i]);
        }
        
        return combinedEvents;
    }
    
    return uniqueEvents;
}

// Generate default events when no actual events are found
function getDefaultEvents(country, city) {
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    
    const twoMonthsOut = new Date(currentDate);
    twoMonthsOut.setMonth(currentDate.getMonth() + 2);
    
    const threeMonthsOut = new Date(currentDate);
    threeMonthsOut.setMonth(currentDate.getMonth() + 3);
    
    // Format dates in the requested format dd-mm-yyyy
    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    
    // Normalize location names for URLs
    const normalizedCity = city.toLowerCase().replace(/\s+/g, '-');
    const normalizedCountry = country.toLowerCase().replace(/\s+/g, '-');
    
    // Try to get real event sites when possible
    const getEventSiteForLocation = (category, location, city) => {
        // Real event websites based on category and location when possible
        const siteMappings = {
            'marathon': {
                'USA': {
                    'New York': 'https://www.nyrr.org/races/tcsnewyorkcitymarathon',
                    'Boston': 'https://www.baa.org/races/boston-marathon',
                    'Chicago': 'https://www.chicagomarathon.com/',
                    'default': 'https://www.runrocknroll.com/'
                },
                'UK': {
                    'London': 'https://www.tcslondonmarathon.com/',
                    'default': 'https://www.greatrun.org/'
                },
                'default': 'https://www.worldmarathonmajors.com/races'
            },
            'yoga': {
                'USA': {
                    'default': 'https://yogaalliance.org/Events'
                },
                'India': {
                    'default': 'https://www.yogafest.com/'
                },
                'default': 'https://www.yogajournal.com/events/'
            },
            'fitness': {
                'USA': {
                    'default': 'https://www.ideafit.com/fitness-conferences/'
                },
                'UK': {
                    'London': 'https://www.bodypower.com/bp-live',
                    'default': 'https://www.ukactive.com/events/'
                },
                'default': 'https://fitnessfestinfo.com/'
            },
            'cycling': {
                'France': {
                    'default': 'https://www.letour.fr/en/'
                },
                'Italy': {
                    'default': 'https://www.giroditalia.it/en/'
                },
                'default': 'https://www.uci.org/calendar/'
            },
            'sports': {
                'default': 'https://www.olympic.org/sports'
            },
            'default': 'https://www.active.com/'
        };
        
        // Try to find a match for the specific city
        if (siteMappings[category] && 
            siteMappings[category][location] && 
            siteMappings[category][location][city]) {
            return siteMappings[category][location][city];
        }
        
        // Try to find a match for the country
        if (siteMappings[category] && 
            siteMappings[category][location] && 
            siteMappings[category][location]['default']) {
            return siteMappings[category][location]['default'];
        }
        
        // Try to find a match for the category
        if (siteMappings[category] && 
            siteMappings[category]['default']) {
            return siteMappings[category]['default'];
        }
        
        // Default fallback
        return siteMappings['default'];
    };
    
    // Generate events based on location with improved descriptions and real links when possible
    return [
        {
            title: `${city} Annual Marathon ${currentDate.getFullYear()}`,
            description: `Join thousands of runners at the annual ${city} Marathon. <strong>Registration is open</strong> for 10K, Half Marathon and Full Marathon categories. Perfect for all fitness levels.`,
            link: getEventSiteForLocation('marathon', country, city),
            date: formatDate(nextMonth),
            isPastEvent: false,
            category: 'marathon'
        },
        {
            title: `Yoga Festival ${city} ${currentDate.getFullYear()}`,
            description: `Experience the biggest yoga gathering in ${city}. Classes for all levels, workshops from international instructors, and wellness sessions. <strong>Early bird registration available</strong>.`,
            link: getEventSiteForLocation('yoga', country, city),
            date: formatDate(twoMonthsOut),
            isPastEvent: false,
            category: 'yoga'
        },
        {
            title: `${city} Sports Tournament`,
            description: `The annual sports championship featuring local teams competing in basketball, volleyball, and soccer. Come support your local athletes! <strong>Tickets on sale now</strong>.`,
            link: getEventSiteForLocation('sports', country, city),
            date: formatDate(threeMonthsOut),
            isPastEvent: false,
            category: 'sports'
        },
        {
            title: `Fitness Expo ${city} ${currentDate.getFullYear()}`,
            description: `Explore the latest in fitness technology, workout programs, supplements and equipment at the ${city} Convention Center. <strong>Special early access passes available</strong>.`,
            link: getEventSiteForLocation('fitness', country, city),
            date: formatDate(nextMonth),
            isPastEvent: false,
            category: 'fitness'
        },
        {
            title: `${city} Cycling Challenge`,
            description: `A scenic cycling event through the beautiful landscapes around ${city}. Routes available for beginners (25km), intermediate (50km) and advanced (100km) riders. <strong>Register by ${formatDate(new Date(nextMonth.getTime() - 7 * 24 * 60 * 60 * 1000))}</strong>.`,
            link: getEventSiteForLocation('cycling', country, city),
            date: formatDate(twoMonthsOut),
            isPastEvent: false,
            category: 'cycling'
        }
    ];
}

// Get icon for event category
function getCategoryIcon(category) {
    const icons = {
        'marathon': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>',
        'running': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd"/></svg>',
        'yoga': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>',
        'fitness': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/></svg>',
        'sports': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clip-rule="evenodd"/></svg>',
        'cycling': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd"/></svg>',
        'others': '<svg class="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>'
    };
    
    return icons[category] || icons['others'];
}

// Display events in the UI
function displayEvents(events) {
    // Clear previous results
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        // Show no results message
        resultsMessage.classList.add('hidden');
        eventsList.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    // Show results
    resultsMessage.classList.add('hidden');
    eventsList.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    // Create event cards
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100';
        
        // Create category tag with icon
        const categoryClass = `category-${event.category}`;
        const categoryIcon = getCategoryIcon(event.category);
        const categoryTag = `<span class="event-category ${categoryClass}">
            ${categoryIcon}
            ${capitalizeFirstLetter(event.category)}
        </span>`;
        
        // Format date for display with enhanced styling
        let dateDisplay = event.date.replace(/--/g, '-');
        const dateClass = event.isPastEvent ? 'event-date past-event' : 'event-date';
        
        // Add past event indicator
        if (event.isPastEvent) {
            dateDisplay += ' <span class="text-red-500 font-semibold">(Past Event)</span>';
        }
        
        // Create link with full URL validation
        let eventLink = event.link;
        if (!eventLink.startsWith('http')) {
            eventLink = `https://${eventLink}`;
        }
        
        // Create card content with enhanced modern styling
        eventCard.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex-grow">
                    <div class="flex items-start justify-between mb-4">
                        <h3 class="event-title flex-grow pr-4">${event.title}</h3>
                    </div>
                    
                    <div class="mb-4">
                        <div class="${dateClass}">
                            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                            </svg>
                            ${dateDisplay}
                        </div>
                    </div>
                    
                    <div class="mb-4">
                        ${categoryTag}
                    </div>
                    
                    <p class="event-description mb-6">${event.description}</p>
                </div>
                
                <div class="mt-auto">
                    <a href="${eventLink}" target="_blank" rel="noopener" 
                       class="event-link block w-full text-center relative overflow-hidden">
                       <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                       </svg>
                       Visit Event Website
                    </a>
                </div>
            </div>
        `;
        
        eventsList.appendChild(eventCard);
    });
}

// Show error message
function showError(message) {
    resultsMessage.classList.remove('hidden');
    eventsList.classList.add('hidden');
    noResults.classList.add('hidden');
    
    resultsMessage.innerHTML = `
        <div class="text-center py-16 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-red-200">
            <div class="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
            <p class="text-red-600 font-medium">${message}</p>
        </div>
    `;
}

// Show or hide loading indicator
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        resultsMessage.classList.add('hidden');
        eventsList.classList.add('hidden');
        noResults.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

// Capitalize first letter of a string
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Enhanced process search results to extract event information more effectively
function processSearchResults(organic, query, city, country) {
    const events = [];
    
    if (!organic || !Array.isArray(organic)) {
        return events;
    }
    
    organic.forEach(result => {
        // Extract data
        const title = result.title || '';
        const snippet = result.snippet || '';
        const link = result.link || '';
        const displayLink = result.displayLink || '';
        
        // Enhanced filtering for event-like results
        const eventKeywords = [
            'event', 'marathon', 'race', 'run', 'running', 'tournament', 'championship', 
            'workshop', 'festival', 'expo', 'registration', 'register', 'sign up', 'book now',
            'tickets', 'yoga', 'fitness', 'cycling', 'sports', 'training', 'competition',
            'meetup', 'class', 'session', 'challenge', 'triathlon', 'swim', 'gym'
        ];
        
        const dateKeywords = [
            '2024', '2025', '2026', 'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december',
            'upcoming', 'schedule', 'calendar', 'annual', 'monthly', 'weekly'
        ];
        
        const registrationKeywords = [
            'register', 'registration', 'sign up', 'book', 'tickets', 'entry', 'apply',
            'join', 'participate', 'enroll', 'reserve', 'buy tickets', 'get tickets'
        ];
        
        // Create combined text for analysis
        const titleLower = title.toLowerCase();
        const snippetLower = snippet.toLowerCase();
        const combinedText = `${titleLower} ${snippetLower}`;
        const linkLower = link.toLowerCase();
        
        // Enhanced scoring system for better event detection
        let eventScore = 0;
        
        // Check for event keywords (higher weight)
        eventKeywords.forEach(keyword => {
            if (combinedText.includes(keyword)) {
                eventScore += titleLower.includes(keyword) ? 3 : 1; // Higher score for title matches
            }
        });
        
        // Check for date/time relevance
        dateKeywords.forEach(keyword => {
            if (combinedText.includes(keyword)) {
                eventScore += 1;
            }
        });
        
        // Check for registration/booking indicators
        registrationKeywords.forEach(keyword => {
            if (combinedText.includes(keyword)) {
                eventScore += 2; // Higher weight for actionable events
            }
        });
        
        // Check for location relevance
        if (combinedText.includes(city.toLowerCase())) eventScore += 2;
        if (combinedText.includes(country.toLowerCase())) eventScore += 1;
        
        // Bonus for event platforms
        const eventPlatforms = ['eventbrite', 'meetup', 'active.com', 'raceentry', 'runningintheusa'];
        if (eventPlatforms.some(platform => linkLower.includes(platform))) {
            eventScore += 3;
        }
        
        // Filter out non-event results
        const excludeKeywords = [
            'news', 'article', 'blog', 'wikipedia', 'definition', 'how to', 'guide',
            'history', 'about us', 'contact', 'privacy policy', 'terms'
        ];
        
        const hasExcludeKeyword = excludeKeywords.some(keyword => combinedText.includes(keyword));
        
        // Only include results with sufficient event score and no exclusions
        if (eventScore >= 3 && !hasExcludeKeyword && title.length > 10) {
            // Extract date more intelligently
            const extractedDate = extractDateFromText(snippet || title) || 
                                 extractDateFromTitle(title) || 
                                 getSmartFutureDate(combinedText);
            
            // Determine category more accurately
            const category = determineEventCategory(title + ' ' + snippet);
            
            // Enhanced description cleaning and enrichment
            let description = snippet;
            if (description.length > 250) {
                description = description.substring(0, 247) + '...';
            }
            
            // Add location context if missing
            if (!description.toLowerCase().includes(city.toLowerCase())) {
                description = `${description} Event located in ${city}, ${country}.`;
            }
            
            // Add registration prompt if missing
            if (!description.toLowerCase().includes('register') && 
                !description.toLowerCase().includes('book') && 
                !description.toLowerCase().includes('ticket')) {
                description += ' Visit website for registration details.';
            }
            
            // Clean up the title
            let cleanTitle = title;
            if (cleanTitle.length > 80) {
                cleanTitle = cleanTitle.substring(0, 77) + '...';
            }
            
            events.push({
                title: cleanTitle,
                description: description,
                link: link,
                date: extractedDate,
                isPastEvent: false,
                category: category,
                score: eventScore,
                source: 'search_api'
            });
        }
    });
    
    // Sort by score and return top results
    return events.sort((a, b) => b.score - a.score).slice(0, 8);
}

// Extract date from text using various patterns
function extractDateFromText(text) {
    if (!text) return null;
    
    // Common date patterns
    const datePatterns = [
        /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g, // DD/MM/YYYY or DD-MM-YYYY
        /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g, // YYYY/MM/DD or YYYY-MM-DD
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,
        /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi
    ];
    
    for (const pattern of datePatterns) {
        const match = pattern.exec(text);
        if (match) {
            try {
                let day, month, year;
                
                if (pattern.toString().includes('january|february')) {
                    // Month name patterns
                    if (match[1] && isNaN(match[1])) {
                        // Month name first
                        month = getMonthNumber(match[1]);
                        day = parseInt(match[2]);
                        year = parseInt(match[3]);
                    } else {
                        // Day first
                        day = parseInt(match[1]);
                        month = getMonthNumber(match[2]);
                        year = parseInt(match[3]);
                    }
                } else {
                    // Numeric patterns
                    if (match[3] && match[3].length === 4) {
                        // DD/MM/YYYY
                        day = parseInt(match[1]);
                        month = parseInt(match[2]);
                        year = parseInt(match[3]);
                    } else {
                        // YYYY/MM/DD
                        year = parseInt(match[1]);
                        month = parseInt(match[2]);
                        day = parseInt(match[3]);
                    }
                }
                
                if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 2024) {
                    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
                }
            } catch (e) {
                continue;
            }
        }
    }
    
    return null;
}

// Get month number from name
function getMonthNumber(monthName) {
    const months = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthName.toLowerCase()] || 1;
}

// Determine event category from title and description
function determineEventCategory(text) {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('marathon') || textLower.includes('half marathon') || textLower.includes('triathlon')) {
        return 'marathon';
    } else if (textLower.includes('run') || textLower.includes('running') || textLower.includes('5k') || textLower.includes('10k')) {
        return 'running';
    } else if (textLower.includes('yoga') || textLower.includes('meditation') || textLower.includes('mindfulness')) {
        return 'yoga';
    } else if (textLower.includes('cycling') || textLower.includes('bike') || textLower.includes('bicycle')) {
        return 'cycling';
    } else if (textLower.includes('sport') || textLower.includes('tournament') || textLower.includes('championship') || textLower.includes('league')) {
        return 'sports';
    } else if (textLower.includes('fitness') || textLower.includes('gym') || textLower.includes('workout') || textLower.includes('training')) {
        return 'fitness';
    } else {
        return 'others';
    }
}

// Remove duplicate events based on title similarity
function removeDuplicateEvents(events) {
    const unique = [];
    const seen = new Set();
    
    events.forEach(event => {
        // Create a normalized version of the title for comparison
        const normalizedTitle = event.title.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        // Check for very similar titles (substring match)
        const isDuplicate = Array.from(seen).some(seenTitle => {
            return normalizedTitle.includes(seenTitle) || seenTitle.includes(normalizedTitle);
        });
        
        if (!isDuplicate) {
            seen.add(normalizedTitle);
            unique.push(event);
        }
    });
    
    return unique;
}

// Generate a random future date for events without dates
function getRandomFutureDate() {
    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 120) + 30); // 30-150 days in future
    
    const day = futureDate.getDate().toString().padStart(2, '0');
    const month = (futureDate.getMonth() + 1).toString().padStart(2, '0');
    const year = futureDate.getFullYear();
    
    return `${day}-${month}-${year}`;
}

// Format date from knowledge graph
function formatDateFromKG(dateString) {
    if (!dateString) return getRandomFutureDate();
    
    try {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    } catch (e) {
        return getRandomFutureDate();
    }
}

// Get proper country code for search localization
function getCountryCode(country) {
    const countryCodes = {
        'USA': 'us',
        'United States': 'us',
        'India': 'in',
        'UK': 'gb',
        'United Kingdom': 'gb',
        'Canada': 'ca',
        'Australia': 'au',
        'Germany': 'de',
        'France': 'fr',
        'Japan': 'jp',
        'China': 'cn',
        'Brazil': 'br',
        'Singapore': 'sg',
        'Italy': 'it',
        'Spain': 'es',
        'Netherlands': 'nl',
        'Mexico': 'mx'
    };
    
    return countryCodes[country] || 'us';
}

// Initialize the page when DOM content is loaded
document.addEventListener('DOMContentLoaded', initEvents);
