# Wedding Website - Castello del Trebbio

A beautiful, mobile-friendly wedding information website for a destination wedding in Tuscany, Italy.

## Features

- Responsive single-page design
- Clean, glassy semi-transparent theme
- Sections: Home, Details, Itinerary, Accommodations, Travel, Explore, RSVP
- RSVP form with Supabase backend integration
- Mobile-first navigation
- Smooth scroll animations

## Quick Start

### Option 1: Local Preview

Simply open `index.html` in your browser to preview the website locally.

### Option 2: Deploy to GitHub Pages (Free Hosting)

1. Create a new GitHub repository
2. Push all files to the repository
3. Go to Settings > Pages
4. Select "Deploy from a branch" and choose `main` branch
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Option 3: Custom Domain

After deploying to GitHub Pages:
1. Go to Settings > Pages
2. Add your custom domain (e.g., `ourwedding.com`)
3. Configure DNS with your domain provider:
   - Add a CNAME record pointing to `yourusername.github.io`

## Setting Up RSVP Storage with Supabase

### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

### Step 2: Create Database Table
1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `migrations/001_create_rsvps_table.sql`
3. Click "Run" to execute

### Step 3: Configure the Website
1. In your Supabase project, go to Settings > API
2. Copy your Project URL and anon/public key
3. Edit `supabase-config.js`:
   - Replace `YOUR_SUPABASE_URL` with your Project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

### Step 4: Enable Supabase in HTML
Add these lines to `index.html` before the closing `</body>` tag:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
```

### Step 5: View RSVPs
1. In Supabase dashboard, go to Table Editor
2. Select the `rsvps` table to see all submissions
3. Use the `rsvp_summary` view for a quick count

## Customization

### Update Names and Date
Edit `index.html`:
- Search for "Bryan & Partner" and replace with your names
- Update "May 2027" with your specific date
- Modify venue details as needed

### Update Colors
Edit `styles.css` and modify the CSS variables at the top:
```css
:root {
    --color-terracotta: #C4785B;  /* Accent color */
    --color-olive: #6B7B5C;       /* Primary color */
    /* ... other colors */
}
```

### Add Images
To add a hero background image:
1. Add your image to the project folder
2. Edit `.hero` in `styles.css`:
```css
.hero {
    background: url('your-image.jpg') center/cover no-repeat;
}
```

## File Structure

```
Wedding/
|-- index.html           # Main website page
|-- styles.css           # All styling
|-- script.js            # Navigation and form functionality
|-- supabase-config.js   # Supabase credentials (edit this)
|-- migrations/
|   |-- 001_create_rsvps_table.sql  # Database setup
|-- README.md            # This file
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

## Performance

- No external JavaScript frameworks required
- Minimal CSS with no preprocessor dependencies
- Single page load, no routing overhead
- Optimized for mobile data connections

## License

This website template is provided for personal use for the wedding celebration.

