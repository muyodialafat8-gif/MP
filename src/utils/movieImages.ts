/**
 * MoviePulse HD Image Mapping Utility
 * Translates seeded Ugandan VJ movies and categories into gorgeous,
 * highly matchable high-definition images from Unsplash.
 */

export function getHdMoviePoster(title: string, originalUrl?: string): string {
  const t = (title || '').toLowerCase().trim();
  
  if (t.includes('osiris')) {
    // Futuristic red and blue cyber armor tech
    return 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=600&auto=format&fit=crop';
  }
  if (t === 'deadtime' || t.includes('dead time')) {
    // Dark silhouette eerie misty graveyard wood
    return 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop';
  }
  if (t.includes('robots') || t.includes('ustopable')) {
    // Sleek glowing cybernetic android close-up
    return 'https://images.unsplash.com/photo-1485527404703-89b55fcc595e?w=600&auto=format&fit=crop';
  }
  if (t.includes('protect and serve')) {
    // Police sirens tactical action squad gears
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop';
  }
  if (t.includes('warrior cop')) {
    // Retro neon underworld fight action
    return 'https://images.unsplash.com/photo-1508847154043-be12a3bab439?w=600&auto=format&fit=crop';
  }
  if (t.includes('idiots')) {
    // High contrast playful pop art and laughter
    return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop';
  }
  if (t.includes('sniper')) {
    // Crosshair target glass scope
    return 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&auto=format&fit=crop';
  }
  if (t.includes('walk to remember')) {
    // Romantic holding hands in golden sunset rays
    return 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop';
  }
  if (t.includes('fat dragon') || t.includes('enter the')) {
    // Dynamic oriental neon dragon street show
    return 'https://images.unsplash.com/photo-1599508704512-2f19efd1e35f?w=600&auto=format&fit=crop';
  }
  if (t.includes('cleaner')) {
    // Monochrome high-rise glass building reflections
    return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop';
  }
  if (t.includes('black mark')) {
    // Terminal computing mainframe terminal code
    return 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=600&auto=format&fit=crop';
  }
  if (t.includes('the eye') || t === 'eye') {
    // Beautiful abstract human eye close-up
    return 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=600&auto=format&fit=crop';
  }
  if (t.includes('harvard') || t.includes('homeless')) {
    // Ivy league academic campus brick arches
    return 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&auto=format&fit=crop';
  }
  if (t.includes('sanyu')) {
    // East African visual vibes
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop';
  }

  // Fallback checks for relative or broken server references
  if (originalUrl && originalUrl.startsWith('http') && !originalUrl.includes('assets/images')) {
    return originalUrl;
  }

  // Generically match based on key segments
  return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop';
}

export function getHdMovieBackdrop(title: string, originalUrl?: string): string {
  const t = (title || '').toLowerCase().trim();

  if (t.includes('osiris')) {
    return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200';
  }
  if (t === 'deadtime' || t.includes('dead time')) {
    return 'https://images.unsplash.com/photo-1505635339303-3194457eb664?w=1200';
  }
  if (t.includes('robots') || t.includes('ustopable')) {
    return 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200';
  }
  if (t.includes('protect and serve')) {
    return 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=1200';
  }
  if (t.includes('warrior cop')) {
    return 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200';
  }
  if (t.includes('idiots')) {
    return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1200';
  }
  if (t.includes('sniper')) {
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200';
  }
  if (t.includes('walk to remember')) {
    return 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=1200';
  }
  if (t.includes('fat dragon') || t.includes('enter the')) {
    return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200';
  }
  if (t.includes('cleaner')) {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200';
  }
  if (t.includes('black mark')) {
    return 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=1200';
  }
  if (t.includes('the eye') || t === 'eye') {
    return 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200';
  }
  if (t.includes('harvard') || t.includes('homeless')) {
    return 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200';
  }

  if (originalUrl && originalUrl.startsWith('http') && !originalUrl.includes('assets/images')) {
    return originalUrl;
  }

  return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200';
}
