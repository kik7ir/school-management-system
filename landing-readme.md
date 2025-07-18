# EduManage Pro - Modern Landing Page

A sleek, responsive, and interactive landing page for EduManage Pro, a student management system. Built with HTML5, CSS3, and vanilla JavaScript.

## Features

- **Fully Responsive**: Works on all devices from mobile to desktop
- **Modern UI/UX**: Clean design with smooth animations and transitions
- **Interactive Elements**: Hover effects, scroll animations, and more
- **Optimized Performance**: Fast loading and optimized assets
- **Accessibility**: Built with accessibility in mind
- **Cross-Browser Compatible**: Works on all modern browsers

## Technologies Used

- HTML5
- CSS3 (with CSS Variables for theming)
- Vanilla JavaScript (ES6+)
- [AOS (Animate On Scroll) Library](https://michalsnik.github.io/aos/)
- [Font Awesome Icons](https://fontawesome.com/)
- [Google Fonts](https://fonts.google.com/)

## File Structure

```
/
├── index.html          # Main HTML file
├── landing.css         # Main stylesheet
├── landing.js          # Main JavaScript file
└── assets/             # Assets directory
    ├── images/         # Image assets
    └── fonts/          # Custom fonts (if any)
```

## Getting Started

1. Clone the repository
2. Open `index.html` in your browser
3. That's it! No build step required

## Customization

### Colors

Edit the CSS variables in the `:root` selector in `landing.css` to customize the color scheme:

```css
:root {
    --primary: #4361ee;
    --primary-dark: #3a56d4;
    --primary-light: #e9ecff;
    --secondary: #3f37c9;
    --accent: #4895ef;
    /* ... other variables ... */
}
```

### Fonts

Update the font imports in the `head` of `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700;800&display=swap" rel="stylesheet">
```

### Animations

Adjust the AOS (Animate On Scroll) settings in `landing.js`:

```javascript
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    mirror: false
});
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS 10+)
- Chrome for Android

## Performance

- Minified and optimized assets
- Lazy loading for images
- Optimized animations for 60fps
- Small bundle size

## Accessibility

- Semantic HTML5 elements
- ARIA attributes where needed
- Keyboard navigation support
- Sufficient color contrast

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits

- [AOS](https://michalsnik.github.io/aos/) for scroll animations
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Fonts](https://fonts.google.com/) for typography
- [Unsplash](https://unsplash.com/) for placeholder images

## Support

For support, email support@edumanagepro.com or open an issue in the GitHub repository.
