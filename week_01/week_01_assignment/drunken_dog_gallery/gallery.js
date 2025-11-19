// Dog Beer Gallery - Interactive Gallery with Filtering and Lightbox

class DogBeerGallery {
    constructor() {
        this.currentImageIndex = 0;
        this.images = [];
        this.filteredImages = [];
        
        // DOM elements
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.galleryItems = document.querySelectorAll('.gallery-item');
        this.lightbox = document.getElementById('lightbox');
        this.lightboxImage = document.getElementById('lightboxImage');
        this.lightboxTitle = document.getElementById('lightboxTitle');
        this.lightboxDescription = document.getElementById('lightboxDescription');
        this.lightboxClose = document.getElementById('lightboxClose');
        this.lightboxPrev = document.getElementById('lightboxPrev');
        this.lightboxNext = document.getElementById('lightboxNext');
        
        // Initialize
        this.initializeImages();
        this.initializeFilters();
        this.initializeLightbox();
    }
    
    initializeImages() {
        // Collect all images from gallery items
        this.galleryItems.forEach((item, index) => {
            const img = item.querySelector('img');
            const info = item.querySelector('.image-info');
            const viewBtn = item.querySelector('.view-btn');
            
            this.images.push({
                src: img.src,
                title: info.querySelector('h3').textContent,
                description: info.querySelector('p').textContent,
                category: item.dataset.category,
                element: item
            });
            
            // Add click handler to image wrapper
            item.querySelector('.image-wrapper').addEventListener('click', () => {
                this.openLightbox(index);
            });
            
            // Add click handler to view button
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openLightbox(index);
            });
        });
        
        this.filteredImages = [...this.images];
    }
    
    initializeFilters() {
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                this.filterButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                const filter = btn.dataset.filter;
                this.filterGallery(filter);
            });
        });
    }
    
    filterGallery(filter) {
        this.galleryItems.forEach((item, index) => {
            const category = item.dataset.category;
            
            if (filter === 'all' || category === filter) {
                item.classList.remove('hidden');
                // Add animation delay based on index
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'scale(1)';
                }, index * 50);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    item.classList.add('hidden');
                }, 300);
            }
        });
        
        // Update filtered images array
        if (filter === 'all') {
            this.filteredImages = [...this.images];
        } else {
            this.filteredImages = this.images.filter(img => img.category === filter);
        }
    }
    
    initializeLightbox() {
        // Close lightbox
        this.lightboxClose.addEventListener('click', () => {
            this.closeLightbox();
        });
        
        // Close on background click
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox) {
                this.closeLightbox();
            }
        });
        
        // Navigation
        this.lightboxPrev.addEventListener('click', () => {
            this.showPreviousImage();
        });
        
        this.lightboxNext.addEventListener('click', () => {
            this.showNextImage();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                this.closeLightbox();
            } else if (e.key === 'ArrowLeft') {
                this.showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                this.showNextImage();
            }
        });
    }
    
    openLightbox(index) {
        // Find the index in filtered images
        const image = this.images[index];
        const filteredIndex = this.filteredImages.findIndex(img => img.src === image.src);
        
        if (filteredIndex !== -1) {
            this.currentImageIndex = filteredIndex;
        } else {
            // If not in filtered, use all images
            this.filteredImages = [...this.images];
            this.currentImageIndex = index;
        }
        
        this.updateLightboxContent();
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    showPreviousImage() {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.filteredImages.length) % this.filteredImages.length;
        this.updateLightboxContent();
    }
    
    showNextImage() {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.filteredImages.length;
        this.updateLightboxContent();
    }
    
    updateLightboxContent() {
        const image = this.filteredImages[this.currentImageIndex];
        this.lightboxImage.src = image.src;
        this.lightboxImage.alt = image.title;
        this.lightboxTitle.textContent = image.title;
        this.lightboxDescription.textContent = image.description;
        
        // Add fade animation
        this.lightboxImage.style.opacity = '0';
        setTimeout(() => {
            this.lightboxImage.style.opacity = '1';
        }, 50);
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DogBeerGallery();
});

