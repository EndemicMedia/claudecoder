document.addEventListener('DOMContentLoaded', function() {
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 20,
          behavior: 'smooth'
        });
      }
    });
  });

  // Feature card animations
  const featureCards = document.querySelectorAll('.feature-card');
  if (featureCards.length > 0) {
    featureCards.forEach(card => {
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px)';
        this.style.boxShadow = '0 12px 20px rgba(0, 0, 0, 0.15)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      });
    });
  }

  // Documentation tab navigation
  const tabNavLinks = document.querySelectorAll('.tab-nav a');
  if (tabNavLinks.length > 0) {
    tabNavLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs
        tabNavLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Show corresponding section
        const targetId = this.getAttribute('href');
        const sections = document.querySelectorAll('section');
        
        sections.forEach(section => {
          section.style.display = section.id === targetId.substring(1) ? 'block' : 'none';
        });
      });
    });
    
    // Initialize first tab as active
    if (tabNavLinks[0]) {
      tabNavLinks[0].click();
    }
  }
});
