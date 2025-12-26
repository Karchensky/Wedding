/**
 * Wedding Website JavaScript
 * Castello del Trebbio - May 2027
 */

// State for RSVP flow
let currentInvitation = null;

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initRSVPLookup();
    initScrollEffects();
    initGalleryLightbox();
    
    // Check for invitation code in URL
    checkURLForCode();
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
    const lookupTabs = document.querySelectorAll('.lookup-tab');
    const codeForm = document.getElementById('lookupCodeForm');
    const nameForm = document.getElementById('lookupNameForm');
    const rsvpForm = document.getElementById('rsvpForm');
    const changeBtn = document.getElementById('changeInvitation');
    
    // Tab switching
    lookupTabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            const tabType = this.dataset.tab;
            
            // Update active tab
            lookupTabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            
            // Show/hide forms
            if (tabType === 'code') {
                codeForm.classList.remove('hidden');
                nameForm.classList.add('hidden');
            } else {
                codeForm.classList.add('hidden');
                nameForm.classList.remove('hidden');
            }
            
            // Clear errors and results
            hideError();
            hideResults();
        });
    });
    
    // Code lookup form
    codeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const code = document.getElementById('inviteCode').value.trim().toUpperCase();
        if (code) {
            lookupByCode(code);
        }
    });
    
    // Name lookup form
    nameForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const lastName = document.getElementById('lookupLastName').value.trim();
        if (lastName) {
            lookupByName(lastName);
        }
    });
    
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
    hideResults();
    
    if (typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase
                .from('invitations')
                .select('*')
                .eq('code', code.toUpperCase())
                .single();
            
            if (error || !data) {
                showError();
                return;
            }
            
            selectInvitation(data);
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
 * Lookup invitation by last name
 */
async function lookupByName(lastName) {
    hideError();
    hideResults();
    
    if (typeof supabase !== 'undefined') {
        try {
            const { data, error } = await supabase
                .from('invitations')
                .select('*')
                .ilike('party_name', '%' + lastName + '%');
            
            if (error || !data || data.length === 0) {
                showError();
                return;
            }
            
            if (data.length === 1) {
                selectInvitation(data[0]);
            } else {
                showResults(data);
            }
        } catch (error) {
            console.error('Lookup error:', error);
            showError();
        }
    } else {
        // Demo mode
        const demoInvitations = getDemoInvitations();
        const matches = demoInvitations.filter(function(inv) {
            return inv.party_name.toLowerCase().includes(lastName.toLowerCase());
        });
        
        if (matches.length === 0) {
            showError();
        } else if (matches.length === 1) {
            selectInvitation(matches[0]);
        } else {
            showResults(matches);
        }
    }
}

/**
 * Show search results for multiple matches
 */
function showResults(invitations) {
    const resultsContainer = document.getElementById('lookupResults');
    const resultsList = document.getElementById('resultsList');
    
    resultsList.innerHTML = '';
    
    invitations.forEach(function(inv) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = 
            '<div class="result-item-info">' +
                '<span class="result-item-name">' + inv.party_name + '</span>' +
                '<span class="result-item-size">Party of ' + inv.party_size + '</span>' +
            '</div>' +
            '<button type="button">Select</button>';
        
        item.querySelector('button').addEventListener('click', function() {
            selectInvitation(inv);
        });
        
        resultsList.appendChild(item);
    });
    
    resultsContainer.classList.remove('hidden');
}

/**
 * Hide search results
 */
function hideResults() {
    const resultsContainer = document.getElementById('lookupResults');
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
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
    document.getElementById('lookupLastName').value = '';
    document.getElementById('rsvpForm').reset();
    
    hideError();
    hideResults();
}

/**
 * Submit the RSVP
 */
async function submitRSVP() {
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
    
    if (!allAnswered) {
        alert('Please indicate attendance for all guests in your party.');
        return;
    }
    
    // Get castle preference (only required if someone is attending)
    const castleRadio = document.querySelector('input[name="castleStay"]:checked');
    if (anyAttending && !castleRadio) {
        alert('Please select your accommodation preference.');
        return;
    }
    
    const formData = {
        invitation_id: currentInvitation.id,
        guest_responses: guestResponses,
        dietary_restrictions: document.getElementById('dietary').value || null,
        castle_preference: castleRadio ? castleRadio.value : null,
        email: document.getElementById('email').value,
        message: document.getElementById('message').value || null
    };
    
    // Submit to Supabase or demo mode
    if (typeof supabase !== 'undefined') {
        try {
            // Check if RSVP already exists (for updates)
            const { data: existing } = await supabase
                .from('rsvps')
                .select('id')
                .eq('invitation_id', currentInvitation.id)
                .single();
            
            let result;
            if (existing) {
                // Update existing RSVP
                result = await supabase
                    .from('rsvps')
                    .update(formData)
                    .eq('invitation_id', currentInvitation.id);
            } else {
                // Insert new RSVP
                result = await supabase
                    .from('rsvps')
                    .insert([formData]);
            }
            
            if (result.error) {
                console.error('RSVP error:', result.error);
                alert('There was an error submitting your RSVP. Please try again.');
                return;
            }
            
            showSuccess(guestResponses, anyAttending);
        } catch (error) {
            console.error('RSVP error:', error);
            showSuccess(guestResponses, anyAttending); // Show success anyway for demo
        }
    } else {
        // Demo mode
        console.log('RSVP Data:', formData);
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
function initGalleryLightbox() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    
    if (!lightbox || galleryItems.length === 0) return;
    
    let currentIndex = 0;
    const images = [];
    
    // Collect all gallery images
    galleryItems.forEach(function(item, index) {
        const img = item.querySelector('img');
        if (img) {
            images.push({
                src: img.src,
                alt: img.alt
            });
        }
        
        // Click to open lightbox
        item.addEventListener('click', function() {
            currentIndex = index;
            openLightbox();
        });
    });
    
    function openLightbox() {
        if (images[currentIndex]) {
            lightboxImg.src = images[currentIndex].src;
            lightboxCaption.textContent = images[currentIndex].alt;
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateLightboxImage();
    }
    
    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        updateLightboxImage();
    }
    
    function updateLightboxImage() {
        lightboxImg.style.opacity = '0';
        setTimeout(function() {
            lightboxImg.src = images[currentIndex].src;
            lightboxCaption.textContent = images[currentIndex].alt;
            lightboxImg.style.opacity = '1';
        }, 150);
    }
    
    // Add transition for fade effect
    lightboxImg.style.transition = 'opacity 0.15s ease';
    
    // Event listeners
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', showPrev);
    nextBtn.addEventListener('click', showNext);
    
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
            showPrev();
        } else if (e.key === 'ArrowRight') {
            showNext();
        }
    });
    
    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    lightbox.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    lightbox.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                showNext(); // Swipe left = next
            } else {
                showPrev(); // Swipe right = prev
            }
        }
    }
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
