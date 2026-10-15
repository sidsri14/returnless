/**
 * Sample Fixtures for ReturnLess
 * Curated test profiles and garments for deterministic demo and automated tests.
 */

export const SAMPLE_SHOPPERS = [
  {
    id: 'shopper_alex',
    name: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    description: 'Minimalist capsule wardrobe focus; aims to eliminate impulse purchases of near-identical knitwear.',
  },
  {
    id: 'shopper_jordan',
    name: 'Jordan Lee',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    description: 'Executive commuter; tests tailored outwear and structured jackets against existing overcoats.',
  },
];

export const SAMPLE_CANDIDATES = [
  {
    id: 'cand_navy_knit',
    name: 'Merino Wool Crewneck Sweater',
    category: 'upper_body',
    palette: ['#1B2A4A', '#243456'],
    price: 95.0,
    brand: 'Everlane Studio',
    retailer: 'Everlane',
    season: 'autumn_winter',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80',
    description: 'Fine-gauge merino wool sweater in dark navy with ribbed cuffs and collar.',
  },
  {
    id: 'cand_heather_cardigan',
    name: 'Heather Slate Zip Cardigan',
    category: 'upper_body',
    palette: ['#757A82', '#5E646E'],
    price: 88.0,
    brand: 'Arket Minimal',
    retailer: 'Arket',
    season: 'autumn_winter',
    imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=600&q=80',
    description: 'Mid-weight knitted zip cardigan in heather slate gray with silver hardware.',
  },
  {
    id: 'cand_ochre_overshirt',
    name: 'Sunset Ochre Corduroy Overshirt',
    category: 'upper_body',
    palette: ['#C98A2C', '#DF9B35'],
    price: 78.0,
    brand: 'COS Modern Classics',
    retailer: 'COS',
    season: 'autumn_winter',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    description: 'Rich warm mustard ochre corduroy boxy fit overshirt with horn buttons.',
  },
];

export const SAMPLE_OWNED_WARDROBE = [
  {
    id: 'owned_navy_jumper',
    name: 'Midnight Navy Cotton Knit',
    category: 'upper_body',
    palette: ['#17253D', '#223048'],
    price: 70.0,
    brand: 'Arket',
    season: 'autumn_winter',
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80',
    acquisitionYear: 2024,
  },
  {
    id: 'owned_charcoal_trench',
    name: 'Slate Charcoal Minimal Trench',
    category: 'outer',
    palette: ['#363A45', '#484E5D'],
    price: 160.0,
    brand: 'Uniqlo U',
    season: 'autumn_winter',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80',
    acquisitionYear: 2023,
  },
  {
    id: 'owned_white_poplin',
    name: 'Classic White Poplin Button-Down',
    category: 'upper_body',
    palette: ['#F8F9FA', '#E2E8F0'],
    price: 55.0,
    brand: 'J.Crew',
    season: 'all_season',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    acquisitionYear: 2024,
  },
  {
    id: 'owned_selvedge_denim',
    name: 'Raw Indigo Selvedge Jeans',
    category: 'lower_body',
    palette: ['#1A2238', '#101626'],
    price: 120.0,
    brand: 'Naked & Famous',
    season: 'all_season',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80',
    acquisitionYear: 2023,
  },
];
