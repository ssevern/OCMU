
export const COLORS = {
  ORANGE: '#F6A028',
  BLACK: '#1A1A1A',
  WHITE: '#FFFFFF',
  LIGHT_GREY: '#F3F4F6',
  GREY: '#9CA3AF'
};

export const DESCRIPTOR_GROUPS = {
  MALT: ["Bready", "Toasty", "Biscuit", "Caramel", "Chocolate", "Coffee", "Roasted", "Grainy"],
  HOPS: ["Citrus", "Pine", "Tropical", "Floral", "Herbal", "Spicy", "Earthy", "Resinous"],
  YEAST: ["Estery", "Phenolic", "Peppery", "Clove", "Banana", "Clean", "Fruity", "Funky"],
  OFF_FLAVORS: ["Diacetyl", "DMS", "Skunky", "Acetaldehyde", "Oxidized", "Solvent", "Sour", "Metallic"]
};

export const LOGO_SVG = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="250" fill="#000000" />
  <circle cx="256" cy="256" r="185" fill="#ffffff" />
  <defs>
    <path id="upperTextPath" d="M 100,256 A 156,156 0 1,1 412,256" fill="transparent" />
    <path id="lowerTextPath" d="M 100,256 A 156,156 0 1,0 412,256" fill="transparent" />
  </defs>
  <text font-family="Montserrat, sans-serif" font-weight="400" font-size="36" fill="white" letter-spacing="6">
    <textPath href="#upperTextPath" startOffset="50%" text-anchor="middle">ORANGE COUNTY</textPath>
  </text>
  <text font-family="Montserrat, sans-serif" font-weight="400" font-size="36" fill="white" letter-spacing="6">
    <textPath href="#lowerTextPath" startOffset="50%" text-anchor="middle" side="right">MASH UPS</textPath>
  </text>
  <g transform="translate(256, 256) rotate(45)">
     <rect x="-6" y="-160" width="12" height="320" fill="#000000" />
     <rect x="-30" y="-160" width="60" height="80" rx="10" fill="#000000" />
     <rect x="-30" y="80" width="60" height="80" rx="10" fill="#000000" />
  </g>
  <g transform="translate(256, 256) rotate(-45)">
     <rect x="-6" y="-160" width="12" height="320" fill="#000000" />
     <rect x="-30" y="-160" width="60" height="80" rx="10" fill="#000000" />
     <rect x="-30" y="80" width="60" height="80" rx="10" fill="#000000" />
  </g>
  <g font-family="Montserrat, sans-serif" font-weight="900" font-size="55" fill="#000000" text-anchor="middle">
    <text x="256" y="145">M</text>
    <text x="135" y="275">O</text>
    <text x="375" y="275">C</text>
    <text x="256" y="405">U</text>
  </g>
  <circle cx="256" cy="256" r="68" fill="#F6A028" stroke="#ffffff" stroke-width="4" />
  <g stroke="#ffffff" stroke-width="3">
    <line x1="256" y1="188" x2="256" y2="324" />
    <line x1="188" y1="256" x2="324" y2="256" />
    <line x1="208" y1="208" x2="304" y2="304" />
    <line x1="208" y1="304" x2="304" y2="208" />
  </g>
</svg>
`;
