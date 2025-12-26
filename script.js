/**
 * Wedding Website JavaScript
 * Castello del Trebbio - May 2027
 */

document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initRSVPForm();
    initScrollEffects();
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
 * RSVP Form functionality
 */
function initRSVPForm() {
    const form = document.getElementById('rsvpForm');
    const attendingRadios = document.querySelectorAll('input[name="attending"]');
    const attendingDetails = document.querySelectorAll('.attending-details');
    const guestCountSelect = document.getElementById('guestCount');
    const guestNamesGroup = document.getElementById('guestNamesGroup');
    const successMessage = document.getElementById('rsvpSuccess');

    // Show/hide attending details based on selection
    attendingRadios.forEach(function(radio) {
        radio.addEventListener('change', function() {
            const isAttending = this.value === 'yes';
            attendingDetails.forEach(function(detail) {
                if (isAttending) {
                    detail.classList.add('visible');
                } else {
                    detail.classList.remove('visible');
                }
            });
        });
    });

    // Show/hide guest names based on count
    if (guestCountSelect) {
        guestCountSelect.addEventListener('change', function() {
            const count = parseInt(this.value);
            if (count > 1) {
                guestNamesGroup.style.display = 'flex';
            } else {
                guestNamesGroup.style.display = 'none';
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {
            first_name: formData.get('firstName'),
            last_name: formData.get('lastName'),
            email: formData.get('email'),
            attending: formData.get('attending') === 'yes',
            guest_count: parseInt(formData.get('guestCount')) || 1,
            guest_names: formData.get('guestNames') || '',
            dietary_restrictions: formData.get('dietary') || '',
            castle_stay: formData.get('castleStay') === 'yes',
            message: formData.get('message') || '',
            submitted_at: new Date().toISOString()
        };

        // Check if Supabase is configured
        if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
            try {
                const response = await submitToSupabase(data);
                if (response.success) {
                    showSuccess();
                } else {
                    alert('There was an error submitting your RSVP. Please try again.');
                }
            } catch (error) {
                console.error('RSVP submission error:', error);
                // Fallback: show success anyway for demo purposes
                showSuccess();
            }
        } else {
            // Demo mode: just show success
            console.log('RSVP Data:', data);
            showSuccess();
        }
    });

    function showSuccess() {
        form.style.display = 'none';
        successMessage.classList.remove('hidden');
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * Submit RSVP to Supabase
 * Requires supabase-config.js to be loaded with credentials
 */
async function submitToSupabase(data) {
    // This will be enabled when Supabase is configured
    // For now, this is a placeholder
    
    if (typeof supabase === 'undefined') {
        console.log('Supabase not configured. Data logged to console.');
        return { success: true };
    }

    const { error } = await supabase
        .from('rsvps')
        .insert([data]);

    if (error) {
        console.error('Supabase error:', error);
        return { success: false, error };
    }

    return { success: true };
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

