/**
 * Wedding Website JavaScript
 * Castello del Trebbio - May 2027
 */

// State for RSVP flow
let currentInvitation = null;

// State for photo uploads
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initRSVPLookup();
    initScrollEffects();
    initGalleryLightbox();
    initLightboxSwipe();
    initPhotoUpload();
    
    // Check for invitation code in URL
    checkURLForCode();
    
    // Load shared photos
    loadSharedPhotos();
});

/**
 * Navigation functionality
 */
function initNavigation() {
    const nav = document.getElementById('mainNav');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const links = navLinks.querySelectorAll('a');

    // Scroll effect for navigation
    function handleScroll() {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on load

    // Mobile menu toggle
    navToggle.addEventListener('click', function() {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    links.forEach(function(link) {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Smooth scroll for anchor links
    links.forEach(function(link) {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const navHeight = nav.offsetHeight;
                    const targetPosition = target.offsetTop - navHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

/**
 * Check URL for invitation code parameter
 */
function checkURLForCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        // Auto-fill the code and trigger lookup
        const codeInput = document.getElementById('inviteCode');
        if (codeInput) {
            codeInput.value = code.toUpperCase();
            // Small delay to ensure page is ready
            setTimeout(function() {
                lookupByCode(code);
            }, 500);
        }
    }
}

/**
 * RSVP Lookup and Form functionality
 */
function initRSVPLookup() {
    const codeForm = document.getElementById('lookupCodeForm');
    const rsvpForm = document.getElementById('rsvpForm');
    const changeBtn = document.getElementById('changeInvitation');
    
    // Code lookup form
    if (codeForm) {
        codeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const code = document.getElementById('inviteCode').value.trim().toUpperCase();
            if (code) {
                lookupByCode(code);
            }
        });
    }
    
    // Change invitation button
    if (changeBtn) {
        changeBtn.addEventListener('click', function() {
            resetToLookup();
        });
    }
    
    // RSVP form submission
    if (rsvpForm) {
        rsvpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitRSVP();
        });
    }
}

/**
 * Lookup invitation by code
 */
async function lookupByCode(code) {
    hideError();
    
    if (supabaseClient) {
        try {
            // Use RPC function for secure lookup (prevents listing all invitations)
            const { data, error } = await supabaseClient
                .rpc('lookup_invitation', { lookup_code: code.toUpperCase() });
            
            if (error || !data || data.length === 0) {
                showError();
                return;
            }
            
            // RPC returns array, get first result
            selectInvitation(data[0]);
        } catch (error) {
            console.error('Lookup error:', error);
            showError();
        }
    } else {
        // Demo mode: use sample data
        const demoInvitations = getDemoInvitations();
        const found = demoInvitations.find(function(inv) { 
            return inv.code === code.toUpperCase(); 
        });
        
        if (found) {
            selectInvitation(found);
        } else {
            showError();
        }
    }
}


/**
 * Show error message
 */
function showError() {
    const errorContainer = document.getElementById('lookupError');
    if (errorContainer) {
        errorContainer.classList.remove('hidden');
    }
}

/**
 * Hide error message
 */
function hideError() {
    const errorContainer = document.getElementById('lookupError');
    if (errorContainer) {
        errorContainer.classList.add('hidden');
    }
}

/**
 * Select an invitation and show the RSVP form
 */
function selectInvitation(invitation) {
    currentInvitation = invitation;
    
    // Update header
    document.getElementById('partyName').textContent = 'Welcome, ' + invitation.party_name + '!';
    document.getElementById('partyInfo').textContent = 'Your party of ' + invitation.party_size + ' is invited to celebrate with us.';
    
    // Set hidden fields
    document.getElementById('invitationId').value = invitation.id;
    document.getElementById('invitationCode').value = invitation.code;
    
    // Pre-fill email if available
    if (invitation.email) {
        document.getElementById('email').value = invitation.email;
    }
    
    // Build guest list
    buildGuestList(invitation.guest_names);
    
    // Show/hide sections based on party size
    const castleGroup = document.getElementById('castleGroup');
    const dietaryGroup = document.getElementById('dietaryGroup');
    
    // Show form step
    document.getElementById('rsvpLookup').classList.add('hidden');
    document.getElementById('rsvpFormStep').classList.remove('hidden');
    
    // Scroll to form
    document.getElementById('rsvpFormStep').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Build the guest list with individual RSVP options
 */
function buildGuestList(guestNames) {
    const guestList = document.getElementById('guestList');
    guestList.innerHTML = '';
    
    guestNames.forEach(function(name, index) {
        const isGuest = name.toLowerCase() === 'guest';
        const displayName = isGuest ? 'Your Guest' : name;
        
        const card = document.createElement('div');
        card.className = 'guest-card';
        card.innerHTML = 
            '<div class="guest-card-header">' +
                '<span class="guest-name">' + displayName + '</span>' +
                '<div class="guest-attending">' +
                    '<label class="radio-label">' +
                        '<input type="radio" name="guest_' + index + '" value="yes" required>' +
                        '<span class="radio-custom"></span>' +
                        'Attending' +
                    '</label>' +
                    '<label class="radio-label">' +
                        '<input type="radio" name="guest_' + index + '" value="no" required>' +
                        '<span class="radio-custom"></span>' +
                        'Unable to Attend' +
                    '</label>' +
                '</div>' +
            '</div>';
        
        // Store the original name as data attribute
        card.dataset.guestName = name;
        card.dataset.guestIndex = index;
        
        guestList.appendChild(card);
    });
}

/**
 * Reset to lookup step
 */
function resetToLookup() {
    currentInvitation = null;
    
    document.getElementById('rsvpFormStep').classList.add('hidden');
    document.getElementById('rsvpSuccess').classList.add('hidden');
    document.getElementById('rsvpLookup').classList.remove('hidden');
    
    // Clear forms
    document.getElementById('inviteCode').value = '';
    document.getElementById('rsvpForm').reset();
    
    hideError();
}

/**
 * Submit the RSVP
 */
async function submitRSVP() {
    console.log('submitRSVP called');
    
    if (!currentInvitation) {
        alert('Please select an invitation first.');
        return;
    }
    
    // Collect guest responses
    const guestCards = document.querySelectorAll('.guest-card');
    const guestResponses = [];
    let allAnswered = true;
    let anyAttending = false;
    
    guestCards.forEach(function(card) {
        const name = card.dataset.guestName;
        const index = card.dataset.guestIndex;
        const selectedRadio = card.querySelector('input[name="guest_' + index + '"]:checked');
        
        if (!selectedRadio) {
            allAnswered = false;
            return;
        }
        
        const attending = selectedRadio.value === 'yes';
        if (attending) anyAttending = true;
        
        guestResponses.push({
            name: name,
            attending: attending
        });
    });
    
    console.log('Guest responses:', guestResponses, 'allAnswered:', allAnswered);
    
    if (!allAnswered) {
        alert('Please indicate attendance for all guests in your party.');
        return;
    }
    
    // Get castle preference (only required if someone is attending)
    const castleRadio = document.querySelector('input[name="castleStay"]:checked');
    console.log('Castle preference:', castleRadio?.value, 'anyAttending:', anyAttending);
    
    if (anyAttending && !castleRadio) {
        alert('Please select your accommodation preference.');
        return;
    }
    
    const emailValue = document.getElementById('email').value;
    console.log('Email:', emailValue);
    
    if (!emailValue) {
        alert('Please enter your email address.');
        return;
    }
    
    const formData = {
        invitation_id: currentInvitation.id,
        guest_responses: guestResponses,
        dietary_restrictions: document.getElementById('dietary').value || null,
        castle_preference: castleRadio ? castleRadio.value : null,
        email: emailValue,
        message: document.getElementById('message').value || null
    };
    
    console.log('Form data:', formData);
    
    // Submit to Supabase or demo mode
    if (supabaseClient) {
        try {
            // First check if RSVP exists (using RPC for security)
            const { data: existingArr } = await supabaseClient
                .rpc('get_rsvp_by_invitation', { inv_id: currentInvitation.id });
            const existing = existingArr && existingArr.length > 0 ? existingArr[0] : null;
            
            console.log('Existing RSVP:', existing);
            
            let result;
            if (existing) {
                // Update existing using RPC function
                console.log('Updating existing RSVP');
                result = await supabaseClient.rpc('update_rsvp', {
                    inv_id: currentInvitation.id,
                    p_guest_responses: guestResponses,
                    p_dietary_restrictions: formData.dietary_restrictions || '',
                    p_castle_preference: formData.castle_preference || '',
                    p_email: formData.email || '',
                    p_message: formData.message || ''
                });
            } else {
                // Insert new using RPC function
                console.log('Inserting new RSVP');
                result = await supabaseClient.rpc('insert_rsvp', {
                    inv_id: currentInvitation.id,
                    p_guest_responses: guestResponses,
                    p_dietary_restrictions: formData.dietary_restrictions || '',
                    p_castle_preference: formData.castle_preference || '',
                    p_email: formData.email || '',
                    p_message: formData.message || ''
                });
            }
            
            console.log('Result:', result);
            
            // Check for Supabase-level error
            if (result.error) {
                console.error('RSVP error:', result.error);
                alert('There was an error submitting your RSVP. Please try again.');
                return;
            }
            
            // Check for RPC function error
            if (result.data && result.data.success === false) {
                console.error('RSVP error:', result.data.error);
                alert('There was an error submitting your RSVP: ' + result.data.error);
                return;
            }
            
            showSuccess(guestResponses, anyAttending);
        } catch (error) {
            console.error('RSVP error:', error);
            alert('There was an error submitting your RSVP. Please try again.');
        }
    } else {
        // Demo mode
        console.log('Demo mode - RSVP Data:', formData);
        showSuccess(guestResponses, anyAttending);
    }
}

/**
 * Show success message
 */
function showSuccess(guestResponses, anyAttending) {
    const attendingCount = guestResponses.filter(function(g) { return g.attending; }).length;
    const totalCount = guestResponses.length;
    
    let message = '';
    if (anyAttending) {
        if (attendingCount === totalCount) {
            message = 'We are thrilled that ';
            if (totalCount === 1) {
                message += 'you will be joining us!';
            } else {
                message += 'your whole party will be joining us!';
            }
        } else {
            message = attendingCount + ' of ' + totalCount + ' guests will be attending. ';
            message += 'We look forward to celebrating with you!';
        }
    } else {
        message = 'We are sorry you will not be able to join us. You will be missed!';
    }
    
    message += ' We will be in touch with more details soon.';
    
    document.getElementById('successMessage').textContent = message;
    
    document.getElementById('rsvpFormStep').classList.add('hidden');
    document.getElementById('rsvpSuccess').classList.remove('hidden');
    document.getElementById('rsvpSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Demo invitations for testing without Supabase
 */
function getDemoInvitations() {
    return [
        {
            id: 'demo-1',
            code: 'SMITH01',
            party_name: 'The Smith Family',
            guest_names: ['John Smith', 'Jane Smith', 'Tommy Smith', 'Sarah Smith'],
            party_size: 4,
            email: 'john.smith@email.com'
        },
        {
            id: 'demo-2',
            code: 'JONES02',
            party_name: 'Michael & Lisa Jones',
            guest_names: ['Michael Jones', 'Lisa Jones'],
            party_size: 2,
            email: 'mjones@email.com'
        },
        {
            id: 'demo-3',
            code: 'BROWN03',
            party_name: 'David Brown',
            guest_names: ['David Brown'],
            party_size: 1,
            email: 'dbrown@email.com'
        },
        {
            id: 'demo-4',
            code: 'WILSON4',
            party_name: 'The Wilson Family',
            guest_names: ['Robert Wilson', 'Emily Wilson', 'Jack Wilson'],
            party_size: 3,
            email: 'rwilson@email.com'
        },
        {
            id: 'demo-5',
            code: 'TAYLOR5',
            party_name: 'Sarah Taylor & Guest',
            guest_names: ['Sarah Taylor', 'Guest'],
            party_size: 2,
            email: 'staylor@email.com'
        }
    ];
}

/**
 * Gallery Lightbox functionality
 */
let galleryImages = [];
let currentGalleryIndex = 0;

function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (!lightbox) return;
    
    // Collect all gallery images
    galleryItems.forEach(function(item, index) {
        const img = item.querySelector('img');
        if (img) {
            galleryImages.push({
                src: img.src,
                alt: img.alt
            });
        }
        
        // Click to open lightbox
        item.addEventListener('click', function() {
            isSharedPhotoLightbox = false;
            currentGalleryIndex = index;
            openGalleryLightbox();
        });
    });
    
    // Add transition for fade effect
    lightboxImg.style.transition = 'opacity 0.15s ease';
    
    // Event listeners
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', handlePrev);
    nextBtn.addEventListener('click', handleNext);
    
    // Close on background click
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            handlePrev();
        } else if (e.key === 'ArrowRight') {
            handleNext();
        }
    });
}

function openGalleryLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (galleryImages[currentGalleryIndex]) {
        lightboxImg.src = galleryImages[currentGalleryIndex].src;
        lightboxCaption.textContent = galleryImages[currentGalleryIndex].alt;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Show nav buttons if more than one image
        if (galleryImages.length > 1) {
            prevBtn.style.display = '';
            nextBtn.style.display = '';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    isSharedPhotoLightbox = false;
}

function handlePrev() {
    if (isSharedPhotoLightbox) {
        showPrevSharedPhoto();
    } else {
        showPrevGalleryImage();
    }
}

function handleNext() {
    if (isSharedPhotoLightbox) {
        showNextSharedPhoto();
    } else {
        showNextGalleryImage();
    }
}

function showPrevGalleryImage() {
    currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
    updateGalleryLightboxImage();
}

function showNextGalleryImage() {
    currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
    updateGalleryLightboxImage();
}

function updateGalleryLightboxImage() {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    
    lightboxImg.style.opacity = '0';
    setTimeout(function() {
        lightboxImg.src = galleryImages[currentGalleryIndex].src;
        lightboxCaption.textContent = galleryImages[currentGalleryIndex].alt;
        lightboxImg.style.opacity = '1';
    }, 150);
}

/**
 * Touch swipe support for lightbox - initialized separately
 */
function initLightboxSwipe() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightbox.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    lightbox.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                handleNext();
            } else {
                handlePrev();
            }
        }
    }, { passive: true });
}

/**
 * Scroll-based animations and effects
 */
function initScrollEffects() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe glass cards for animation
    document.querySelectorAll('.glass-card').forEach(function(card) {
        card.style.opacity = '0';
        observer.observe(card);
    });

    // Active navigation link highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    function highlightNav() {
        const scrollPos = window.scrollY + 100;

        sections.forEach(function(section) {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinks.forEach(function(link) {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + id) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);
}

/**
 * Photo Upload functionality
 */
function initPhotoUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const photoInput = document.getElementById('photoInput');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewGrid = document.getElementById('previewGrid');
    const clearBtn = document.getElementById('clearPhotos');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('photoUploadForm');
    const uploadSuccess = document.getElementById('uploadSuccess');
    const uploadMore = document.getElementById('uploadMore');
    
    if (!uploadZone) return;
    
    // Click to browse
    uploadZone.addEventListener('click', function() {
        photoInput.click();
    });
    
    // File input change
    photoInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    
    // Clear all
    clearBtn.addEventListener('click', function() {
        clearAllFiles();
    });
    
    // Upload more button
    uploadMore.addEventListener('click', function() {
        uploadSuccess.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        clearAllFiles();
    });
    
    // Form submit
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        uploadPhotos();
    });
    
    function handleFiles(files) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Validate type
            if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
                alert('Please upload only JPG, PNG, or WebP images.');
                continue;
            }
            
            // Validate size
            if (file.size > maxSize) {
                alert('File "' + file.name + '" is too large. Maximum size is 10MB.');
                continue;
            }
            
            // Add to selected files
            selectedFiles.push(file);
        }
        
        updatePreview();
    }
    
    function updatePreview() {
        previewGrid.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            uploadPreview.classList.add('hidden');
            uploadBtn.disabled = true;
            return;
        }
        
        uploadPreview.classList.remove('hidden');
        uploadBtn.disabled = false;
        
        selectedFiles.forEach(function(file, index) {
            const item = document.createElement('div');
            item.className = 'preview-item';
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updatePreview();
            });
            
            item.appendChild(img);
            item.appendChild(removeBtn);
            previewGrid.appendChild(item);
        });
    }
    
    function clearAllFiles() {
        selectedFiles = [];
        photoInput.value = '';
        updatePreview();
    }
    
    async function uploadPhotos() {
        const uploaderName = document.getElementById('uploaderName').value.trim();
        const caption = document.getElementById('photoCaption').value.trim();
        
        if (!uploaderName) {
            alert('Please enter your name.');
            return;
        }
        
        if (selectedFiles.length === 0) {
            alert('Please select at least one photo.');
            return;
        }
        
        uploadBtn.classList.add('uploading');
        uploadBtn.disabled = true;
        
        if (supabaseClient) {
            try {
                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const fileName = Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + file.name;
                    
                    // Upload to Supabase Storage
                    const { data: uploadData, error: uploadError } = await supabaseClient.storage
                        .from('wedding-photos')
                        .upload(fileName, file);
                    
                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        continue;
                    }
                    
                    // Get public URL
                    const { data: urlData } = supabaseClient.storage
                        .from('wedding-photos')
                        .getPublicUrl(fileName);
                    
                    // Save metadata to database
                    await supabaseClient.from('shared_photos').insert([{
                        file_path: fileName,
                        file_url: urlData.publicUrl,
                        uploader_name: uploaderName,
                        caption: caption || null
                    }]);
                }
                
                showUploadSuccess();
                loadSharedPhotos(); // Refresh the gallery
            } catch (error) {
                console.error('Upload error:', error);
                alert('There was an error uploading your photos. Please try again.');
                uploadBtn.classList.remove('uploading');
                uploadBtn.disabled = false;
            }
        } else {
            // Demo mode
            console.log('Demo upload:', {
                files: selectedFiles.map(function(f) { return f.name; }),
                uploader: uploaderName,
                caption: caption
            });
            
            // Simulate upload delay
            setTimeout(function() {
                showUploadSuccess();
            }, 1500);
        }
    }
    
    function showUploadSuccess() {
        uploadBtn.classList.remove('uploading');
        uploadBtn.disabled = false;
        uploadForm.classList.add('hidden');
        uploadSuccess.classList.remove('hidden');
        document.getElementById('uploaderName').value = '';
        document.getElementById('photoCaption').value = '';
        clearAllFiles();
    }
}

/**
 * Load shared photos from database
 */
let photosOffset = 0;
const photosLimit = 50;
let allSharedPhotos = [];
let filteredSharedPhotos = [];
let currentSharedPhotoIndex = 0;
let isSharedPhotoLightbox = false;

async function loadSharedPhotos(loadMore) {
    const grid = document.getElementById('sharedPhotosGrid');
    const noPhotosMessage = document.getElementById('noPhotosMessage');
    const loadMoreBtn = document.getElementById('loadMorePhotos');
    
    if (!grid) return;
    
    if (!loadMore) {
        photosOffset = 0;
        allSharedPhotos = [];
    }
    
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('shared_photos')
                .select('*')
                .order('created_at', { ascending: false })
                .range(photosOffset, photosOffset + photosLimit - 1);
            
            if (error) {
                console.error('Error loading photos:', error);
                return;
            }
            
            if (data && data.length > 0) {
                noPhotosMessage.style.display = 'none';
                allSharedPhotos = allSharedPhotos.concat(data);
                filteredSharedPhotos = allSharedPhotos;
                
                renderSharedPhotos();
                
                photosOffset += data.length;
                
                if (data.length === photosLimit) {
                    loadMoreBtn.classList.remove('hidden');
                } else {
                    loadMoreBtn.classList.add('hidden');
                }
            } else if (!loadMore) {
                noPhotosMessage.style.display = 'block';
                loadMoreBtn.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error loading photos:', error);
        }
    }
    
    // Set up load more button
    if (loadMoreBtn && !loadMoreBtn.hasListener) {
        loadMoreBtn.addEventListener('click', function() {
            loadSharedPhotos(true);
        });
        loadMoreBtn.hasListener = true;
    }
    
    // Set up filter
    initPhotoFilter();
}

function initPhotoFilter() {
    const filterInput = document.getElementById('photoFilter');
    if (filterInput && !filterInput.hasListener) {
        filterInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            if (query === '') {
                filteredSharedPhotos = allSharedPhotos;
            } else {
                filteredSharedPhotos = allSharedPhotos.filter(function(photo) {
                    const nameMatch = photo.uploader_name.toLowerCase().includes(query);
                    const captionMatch = photo.caption && photo.caption.toLowerCase().includes(query);
                    return nameMatch || captionMatch;
                });
            }
            renderSharedPhotos();
        });
        filterInput.hasListener = true;
    }
}

function renderSharedPhotos() {
    const grid = document.getElementById('sharedPhotosGrid');
    const noPhotosMessage = document.getElementById('noPhotosMessage');
    
    // Clear existing photos
    const existingPhotos = grid.querySelectorAll('.shared-photo-item');
    existingPhotos.forEach(function(p) { p.remove(); });
    
    if (filteredSharedPhotos.length === 0) {
        noPhotosMessage.style.display = 'block';
        noPhotosMessage.textContent = allSharedPhotos.length === 0 
            ? 'Photos shared during the celebration will appear here.'
            : 'No photos match your filter.';
        return;
    }
    
    noPhotosMessage.style.display = 'none';
    
    filteredSharedPhotos.forEach(function(photo, index) {
        const item = createSharedPhotoItem(photo, index);
        grid.appendChild(item);
    });
}

function createSharedPhotoItem(photo, index) {
    const item = document.createElement('div');
    item.className = 'shared-photo-item';
    
    const img = document.createElement('img');
    img.src = photo.file_url;
    img.alt = photo.caption || 'Shared by ' + photo.uploader_name;
    img.loading = 'lazy';
    
    const info = document.createElement('div');
    info.className = 'shared-photo-info';
    
    const name = document.createElement('div');
    name.className = 'shared-photo-name';
    name.textContent = photo.uploader_name;
    info.appendChild(name);
    
    if (photo.caption) {
        const caption = document.createElement('div');
        caption.className = 'shared-photo-caption';
        caption.textContent = photo.caption;
        info.appendChild(caption);
    }
    
    item.appendChild(img);
    item.appendChild(info);
    
    // Click to open in lightbox
    item.addEventListener('click', function() {
        openSharedPhotoLightbox(index);
    });
    
    return item;
}

function openSharedPhotoLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (!lightbox || filteredSharedPhotos.length === 0) return;
    
    isSharedPhotoLightbox = true;
    currentSharedPhotoIndex = index;
    
    updateSharedPhotoLightbox();
    
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Show nav buttons if more than one photo
    if (filteredSharedPhotos.length > 1) {
        prevBtn.style.display = '';
        nextBtn.style.display = '';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function updateSharedPhotoLightbox() {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const photo = filteredSharedPhotos[currentSharedPhotoIndex];
    
    if (!photo) return;
    
    lightboxImg.style.opacity = '0';
    setTimeout(function() {
        lightboxImg.src = photo.file_url;
        lightboxCaption.textContent = photo.caption 
            ? photo.caption + ' - ' + photo.uploader_name 
            : 'Shared by ' + photo.uploader_name;
        lightboxImg.style.opacity = '1';
    }, 150);
}

function showPrevSharedPhoto() {
    currentSharedPhotoIndex = (currentSharedPhotoIndex - 1 + filteredSharedPhotos.length) % filteredSharedPhotos.length;
    updateSharedPhotoLightbox();
}

function showNextSharedPhoto() {
    currentSharedPhotoIndex = (currentSharedPhotoIndex + 1) % filteredSharedPhotos.length;
    updateSharedPhotoLightbox();
}
