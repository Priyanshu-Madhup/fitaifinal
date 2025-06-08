/**
 * FitAi - Workout Demos
 * This file provides the functionality for the demos.html page
 * It processes uploaded PDFs using PDF.js, extracts exercise names,
 * and finds YouTube videos for each exercise using Serper API
 */

// Debug information
console.log('demos.js loaded');
console.log('Environment check:', {
    hasWindow: typeof window !== 'undefined',
    hasConfig: typeof window !== 'undefined' && !!window.FitAiConfig,
    hasGroq: typeof window !== 'undefined' && window.FitAiConfig && !!window.FitAiConfig.apiKeys && !!window.FitAiConfig.apiKeys.groq,
    hasSerper: typeof window !== 'undefined' && window.FitAiConfig && !!window.FitAiConfig.apiKeys && !!window.FitAiConfig.apiKeys.serper,
    hasEnv: typeof window !== 'undefined' && !!window.__env
});

// Get API keys with fallback mechanisms
const GROQ_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.groq) || 
    (typeof window !== 'undefined' && window.__env && window.__env.GROQ_API_KEY) ||
    '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'; // Fallback for debugging only

const SERPER_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.serper) || 
    (typeof window !== 'undefined' && window.__env && window.__env.SERPER_API_KEY) ||
    'bead06c1090f8b45c3aabced3c5f723d5c5c3148'; // Fallback for debugging only

// DOM elements
const fileUpload = document.getElementById('pdf-upload');
const fileName = document.getElementById('file-name');
const processButton = document.getElementById('process-pdf');
const loadingContainer = document.getElementById('loading-container');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const resultsContainer = document.getElementById('results-container');
const videoCards = document.getElementById('video-cards');
const videoModal = document.getElementById('video-modal');
const modalTitle = document.getElementById('modal-title');
const youtubeIframe = document.getElementById('youtube-iframe');
const closeModal = document.getElementById('close-modal');

// Store the extracted exercises
let extractedExercises = [];

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/pdf.worker.min.js';

// File upload event handler
fileUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (file) {
        // Check if it's a PDF
        if (file.type !== 'application/pdf') {
            fileName.textContent = 'Please select a PDF file.';
            processButton.disabled = true;
            return;
        }
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            fileName.textContent = 'File is too large. Please select a file under 5MB.';
            processButton.disabled = true;
            return;
        }
        
        fileName.textContent = file.name;
        processButton.disabled = false;
    } else {
        fileName.textContent = '';
        processButton.disabled = true;
    }
});

// Process PDF button click handler
processButton.addEventListener('click', async function() {
    const file = fileUpload.files[0];
    
    if (!file) {
        showError('Please select a PDF file.');
        return;
    }
    
    // Show loading indicator
    loadingContainer.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    processButton.disabled = true;
    
    try {
        // Read the PDF file
        const pdfData = await readPDFFile(file);
        
        // Extract exercise names using Groq AI
        extractedExercises = await extractExercisesWithGroq(pdfData);
        
        if (extractedExercises.length === 0) {
            throw new Error('No exercises found in the PDF. Please make sure you uploaded a workout plan PDF generated from FitAi.');
        }
        
        // Find videos for each exercise
        await findAndDisplayVideos(extractedExercises);
        
        // Show results
        loadingContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error processing PDF:', error);
        showError(error.message || 'An error occurred while processing the PDF.');
        loadingContainer.classList.add('hidden');
    }
});

// Read PDF file using PDF.js
async function readPDFFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            try {
                const arrayBuffer = event.target.result;
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                let fullText = '';
                
                // Extract text from each page
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + ' ';
                }
                
                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(event) {
            reject(new Error('Failed to read the PDF file.'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Extract exercise names using Groq's Llama3.3 API
async function extractExercisesWithGroq(pdfText) {
    const prompt = `
    You are an AI assistant specialized in fitness. The following text was extracted from a workout plan PDF.
    Please identify all exercise names mentioned in this text and return them as a JSON array of strings.
    Only include proper exercise names, not section titles or other text. Remove any duplicate exercises.
    If there are variations of the same exercise (e.g., "Barbell Squat" and "Barbell Back Squat"), keep both.
    
    PDF Text:
    ${pdfText}
    
    Return only a JSON array of exercise names, nothing else. Format: ["Exercise 1", "Exercise 2", ...]
    `;
    
    try {
        // Log API key status (not the actual key)
        console.log('GROQ API Key available:', !!GROQ_API_KEY);
        
        // Check if API key is available
        if (!GROQ_API_KEY) {
            console.error('No GROQ API key available');
            throw new Error('API key missing. Please check your configuration.');
        }
        
        // First try with Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [
                    { role: 'system', content: 'You are a fitness expert assistant that extracts exercise names from text.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 1024
            })
        });
        
        if (!response.ok) {
            console.error(`Groq API error: ${response.status}`);
            
            // If API fails, try fallback method - basic extraction using regex
            console.log('Using fallback extraction method');
            return extractExercisesFromTextFallback(pdfText);
        }
        
        const data = await response.json();
        const exerciseText = data.choices[0].message.content.trim();
        
        // Extract the JSON array from the text response
        let jsonMatch = exerciseText.match(/\[.*\]/s);
        if (!jsonMatch) {
            console.warn('Could not parse the exercise list from AI response, using fallback');
            return extractExercisesFromTextFallback(pdfText);
        }
        
        try {
            // Parse the JSON array
            let exercises = JSON.parse(jsonMatch[0]);
            
            // If we got an empty array, try the fallback
            if (exercises.length === 0) {
                console.warn('AI returned empty exercise list, using fallback');
                return extractExercisesFromTextFallback(pdfText);
            }
            
            return exercises;
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return extractExercisesFromTextFallback(pdfText);
        }
    } catch (error) {
        console.error('Error extracting exercises with Groq:', error);
        
        // Try fallback method if main method failed
        try {
            return extractExercisesFromTextFallback(pdfText);
        } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
            throw new Error('Failed to extract exercises from the PDF. Please try again.');
        }
    }
}

// Fallback function to extract exercises using regex patterns
function extractExercisesFromTextFallback(pdfText) {
    console.log('Using regex fallback to extract exercises');
    
    // Common fitness exercise keywords to look for
    const exercisePatterns = [
        // Format: Exercise name followed by sets/reps
        /([A-Z][a-zA-Z\s\-]+(Press|Curl|Extension|Raise|Fly|Row|Squat|Lunge|Deadlift|Crunch|Up)s?)\s*[:\-]?\s*\d+[\s\-]*([xX]|sets?|reps?)/g,
        
        // Format: Exercise with numbers
        /([A-Z][a-zA-Z\s\-]+(Press|Curl|Extension|Raise|Fly|Row|Squat|Lunge|Deadlift|Crunch|Up)s?)\s*[:\-]?\s*\d+/g,
        
        // Common exercise names without context
        /\b(Bench Press|Squats?|Deadlifts?|Lunges?|Plank|Push[ \-]?Ups?|Pull[ \-]?Ups?|Crunches?|Burpees?|Bicep Curls?|Tricep Extensions?|Shoulder Press|Lat Pulldown|Leg Press|Leg Extension|Leg Curl|Calf Raise|Dumbbell Fly)\b/gi
    ];
    
    let exercises = new Set();
    
    // Apply each pattern and collect matches
    for (const pattern of exercisePatterns) {
        const matches = pdfText.match(pattern) || [];
        matches.forEach(match => {
            // Clean up the exercise name
            let cleanedMatch = match.trim()
                .replace(/\d+[\s\-]*(sets?|reps?|[xX])/g, '')
                .replace(/[:;,\-–—]\s*\d+/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
                
            // Only add if it's reasonable length for an exercise name
            if (cleanedMatch.length > 3 && cleanedMatch.length < 40) {
                exercises.add(cleanedMatch);
            }
        });
    }
    
    // Convert set to array
    const extractedExercises = Array.from(exercises);
    
    // If we didn't find any exercises, add some default ones
    if (extractedExercises.length === 0) {
        return [
            "Squats", 
            "Push-ups", 
            "Deadlifts", 
            "Bench Press", 
            "Plank"
        ];
    }
    
    return extractedExercises;
}

// Find YouTube videos for exercises using Serper API
async function findAndDisplayVideos(exercises) {
    // Clear previous results
    videoCards.innerHTML = '';
    
    // Process up to 12 exercises
    const exercisesToProcess = exercises.slice(0, 12);
    
    // Create a set of promises for parallel processing
    const videoPromises = exercisesToProcess.map(async (exercise) => {
        try {
            const videoInfo = await searchYouTubeVideo(exercise);
            return { exercise, videoInfo };
        } catch (error) {
            console.error(`Error finding video for ${exercise}:`, error);
            return { exercise, videoInfo: null };
        }
    });
    
    // Wait for all video searches to complete
    const results = await Promise.all(videoPromises);
    
    // Filter out exercises with no video results
    const successfulResults = results.filter(result => result.videoInfo !== null);
    
    // Display video cards
    successfulResults.forEach(result => {
        const { exercise, videoInfo } = result;
        createVideoCard(exercise, videoInfo);
    });
    
    // Show message if no videos were found
    if (successfulResults.length === 0) {
        videoCards.innerHTML = `
            <div class="col-span-full text-center py-10">
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h18M3 16h18"></path>
                </svg>
                <h3 class="text-xl font-semibold text-gray-500 mb-2">No Videos Found</h3>
                <p class="text-gray-500">We couldn't find any videos for the exercises in your workout plan. Please try a different PDF.</p>
            </div>
        `;
    }
}

// Search for YouTube video using Serper API
async function searchYouTubeVideo(exerciseName) {
    const query = `${exerciseName} exercise tutorial proper form`;
    
    try {
        const response = await fetch('https://google.serper.dev/videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': SERPER_API_KEY
            },
            body: JSON.stringify({
                q: query,
                gl: 'us',
                hl: 'en',
                num: 5
            })
        });
        
        if (!response.ok) {
            throw new Error(`Serper API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if there are video results
        if (!data.videos || data.videos.length === 0) {
            return null;
        }
        
        // Find the most relevant video (preferably from a fitness channel)
        const preferredChannels = ['ATHLEAN-X', 'Jeremy Ethier', 'Jeff Nippard', 'FitnessBlender', 'Buff Dudes', 
                                  'THENX', 'Bodybuilding.com', 'Calisthenicmovement', 'Fitness FAQs'];
        
        let bestVideo = null;
        
        // Try to find a video from preferred channels first
        for (const video of data.videos) {
            const channelName = video.channelName || '';
            if (preferredChannels.some(channel => channelName.includes(channel))) {
                bestVideo = video;
                break;
            }
        }
        
        // If no preferred channel found, use the first result
        if (!bestVideo && data.videos.length > 0) {
            bestVideo = data.videos[0];
        }
        
        if (!bestVideo) {
            return null;
        }
        
        // Extract video ID from link
        const videoIdMatch = bestVideo.link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
        if (!videoIdMatch) {
            return null;
        }
        
        const videoId = videoIdMatch[1];
        
        return {
            title: bestVideo.title,
            thumbnail: bestVideo.thumbnail,
            channelName: bestVideo.channelName || 'YouTube Channel',
            link: bestVideo.link,
            videoId: videoId,
            duration: bestVideo.duration || ''
        };
    } catch (error) {
        console.error('Error searching YouTube video:', error);
        return null;
    }
}

// Create video card element
function createVideoCard(exercise, videoInfo) {
    const card = document.createElement('div');
    card.className = 'video-card relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden group';
    
    // Create a thumbnail URL from the video ID
    const thumbnailUrl = `https://img.youtube.com/vi/${videoInfo.videoId}/maxresdefault.jpg`;
    
    card.innerHTML = `
        <div class="video-card-inner">
            <div class="relative overflow-hidden">
                <img src="${thumbnailUrl}" alt="${exercise} demonstration" class="exercise-image w-full h-200 object-cover transition-transform duration-300 group-hover:scale-105" 
                     onerror="this.src='https://img.youtube.com/vi/${videoInfo.videoId}/hqdefault.jpg'">
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="play-button">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                    </svg>
                </div>
            </div>
            
            <div class="video-card-body">
                <div class="mb-3">
                    <span class="exercise-tag">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>
                        </svg>
                        Exercise Demo
                    </span>
                </div>
                
                <h3 class="card-title">${exercise}</h3>
                <p class="card-description">
                    <svg class="w-4 h-4 inline mr-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd"/>
                    </svg>
                    ${videoInfo.channelName || 'Professional Fitness Channel'}
                </p>
            </div>
            
            <div class="video-card-footer">
                <button class="play-video-btn watch-button" data-video-id="${videoInfo.videoId}" data-exercise="${exercise}">
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                    </svg>
                    Watch Demo
                </button>
            </div>
        </div>
    `;
    
    // Add the card to the grid
    videoCards.appendChild(card);
    
    // Add event listener to play button
    const playButton = card.querySelector('.play-video-btn');
    playButton.addEventListener('click', function() {
        const videoId = this.dataset.videoId;
        const exercise = this.dataset.exercise;
        openVideoModal(videoId, exercise);
    });
}

// Open video modal
function openVideoModal(videoId, exercise) {
    modalTitle.textContent = `${exercise} - Demo`;
    youtubeIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    videoModal.classList.remove('hidden');
    
    // Add event listener to close when clicking outside the modal content
    videoModal.addEventListener('click', function(event) {
        if (event.target === videoModal) {
            closeVideoModal();
        }
    });
    
    // Add keyboard event listener for Escape key
    document.addEventListener('keydown', closeModalOnEscape);
}

// Close video modal
function closeVideoModal() {
    youtubeIframe.src = '';
    videoModal.classList.add('hidden');
    document.removeEventListener('keydown', closeModalOnEscape);
}

// Close modal when Escape key is pressed
function closeModalOnEscape(event) {
    if (event.key === 'Escape') {
        closeVideoModal();
    }
}

// Close modal button event listener
closeModal.addEventListener('click', closeVideoModal);

// Display error message
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    loadingContainer.classList.add('hidden');
    processButton.disabled = false;
}

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
});
