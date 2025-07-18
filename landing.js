// DOM Elements
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-link');
const backToTopBtn = document.querySelector('.back-to-top');

// Mobile menu toggle
hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking on a nav link
navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger?.classList.remove('active');
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Show/hide back to top button
    if (window.scrollY > 300) {
        backToTopBtn?.classList.add('show');
    } else {
        backToTopBtn?.classList.remove('show');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Back to top button
backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Initialize AOS (Animate On Scroll)
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        mirror: false
    });
}

// Floating elements animation
const floatingElements = document.querySelectorAll('.floating-element');
if (floatingElements.length > 0) {
    floatingElements.forEach((element, index) => {
        element.style.setProperty('--delay', index + 1);
    });
}

// Intersection Observer for scroll animations
const animateOnScroll = () => {
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    elements.forEach(element => {
        observer.observe(element);
    });
};

// Initialize animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add scrolled class to navbar on page load if scrolled
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }

    // Initialize scroll animations
    animateOnScroll();

    // Add loading animation to hero section
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(20px)';
        heroContent.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        
        setTimeout(() => {
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 300);
    }
});

// Add animation to feature cards on hover
const featureCards = document.querySelectorAll('.feature-card');
featureCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        const icon = card.querySelector('.feature-icon');
        if (icon) {
            icon.style.transform = 'rotateY(180deg)';
            setTimeout(() => {
                icon.style.transform = 'rotateY(0deg)';
            }, 300);
        }
    });
});

// Parallax effect for hero section
const hero = document.querySelector('.hero');
if (hero) {
    window.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth - e.pageX * 0.5) / 100;
        const y = (window.innerHeight - e.pageY * 0.5) / 100;
        
        const dashboardPreview = document.querySelector('.dashboard-preview');
        if (dashboardPreview) {
            dashboardPreview.style.transform = `perspective(1000px) rotateY(${x}deg) rotateX(${y}deg)`;
        }
    });
}

// Add loading animation to elements with data-aos attribute
document.addEventListener('aos:in', ({ detail }) => {
    if (detail.classList.contains('feature-card')) {
        detail.style.transform = 'translateY(0)';
        detail.style.opacity = '1';
    }
});

// Handle video modal
const videoModal = document.getElementById('videoModal');
const videoIframe = document.getElementById('videoIframe');
const closeModal = document.querySelector('.close-modal');
const watchDemoBtn = document.querySelector('.btn-outline');

if (watchDemoBtn) {
    watchDemoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (videoModal) {
            videoModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            videoIframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1';
        }
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        if (videoModal) {
            videoModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            videoIframe.src = '';
        }
    });
}

// Close modal when clicking outside the content
window.addEventListener('click', (e) => {
    if (e.target === videoModal) {
        videoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        videoIframe.src = '';
    }
});

// Form validation for contact form
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simple validation
        const name = contactForm.querySelector('input[name="name"]').value.trim();
        const email = contactForm.querySelector('input[name="email"]').value.trim();
        const message = contactForm.querySelector('textarea[name="message"]').value.trim();
        
        if (!name || !email || !message) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Here you would typically send the form data to a server
        console.log('Form submitted:', { name, email, message });
        
        // Show success message
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });
}

// Add animation to pricing cards
const pricingCards = document.querySelectorAll('.pricing-card');
pricingCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
        card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.1)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.05)';
    });
});

// Initialize tooltips
const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
if (typeof bootstrap !== 'undefined') {
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Add animation to stats counter
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

const animateOnScrollStats = () => {
    const stats = document.querySelectorAll('.stat-number');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                const target = entry.target;
                const value = parseInt(target.getAttribute('data-value'));
                animateValue(target, 0, value, 2000);
                target.classList.add('animated');
                observer.unobserve(target);
            }
        });
    }, {
        threshold: 0.5
    });

    stats.forEach(stat => {
        observer.observe(stat);
    });
};

// Initialize stats animation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    animateOnScrollStats();
});
