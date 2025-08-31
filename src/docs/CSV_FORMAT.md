# Standardized CSV Format for Trading Cards

This document defines the standardized CSV format used across all import/export operations in the trading card system.

## Standard Field Order

All CSV exports and imports use this exact field order:

```csv
card_id,code,name,suit,rank,era,rarity,time_value,trader_value,image_code,image_url,description,status,is_active,current_target,qr_dark,qr_light
```

## Field Definitions

### Core Identifiers
- **card_id** (string): Immutable UUID for existing cards. Required for updates.
- **code** (string): Human-readable card code. Required for new card creation.

### Card Information
- **name** (string): Display name of the card
- **suit** (string): Card suit (e.g., "Hearts", "Spades")
- **rank** (string): Card rank (e.g., "Ace", "King", "2")
- **era** (string): Time period or era (e.g., "Modern", "Vintage")
- **rarity** (string): Rarity level (e.g., "Common", "Rare", "Legendary")

### Values
- **time_value** (integer): Time-based value for redemptions (default: 0)
- **trader_value** (string): Trading value description

### Media Fields
- **image_code** (string): **PREFERRED** - Reference to image in database (e.g., "a1", "hero_001")
- **image_url** (string): Direct URL to image (used if image_code not provided)

### Metadata
- **description** (string): Long-form description of the card
- **status** (string): Card status ("active", "inactive", "draft", etc.)
- **is_active** (boolean): Whether card can be claimed (true/false)
- **current_target** (string): Redirect URL when card is scanned

### QR Customization
- **qr_dark** (string): Dark color for QR code (hex format: #000000)
- **qr_light** (string): Light color for QR code (hex format: #FFFFFF)

## Image Code System

### Using Image Codes (Recommended)
Instead of managing full image URLs, use the image code system:

1. Upload images via the Admin → QR Generator → Image Library
2. Each image gets assigned a code (a1, a2, hero_001, etc.)
3. Reference the code in the `image_code` field
4. The system automatically resolves codes to URLs during import

### Benefits
- **Easier management**: Just use "a1" instead of long URLs
- **Consistency**: All images are centrally managed
- **Flexibility**: Change image URLs without updating all CSV files

## Import Behavior

### Update vs Create
- If `card_id` is provided → **Update existing card**
- If only `code` is provided → **Create new card**

### Image Resolution Priority
1. If `image_code` is provided → Resolve to URL from database
2. If `image_url` is provided → Use direct URL
3. If both provided → `image_code` takes priority

### Required Fields
- For updates: `card_id`
- For new cards: `code`, `name`, `suit`, `rank`, `era`

## Export Behavior

### Image Code Detection
When exporting cards:
- If the card's `image_url` matches a known image in the database, export the `image_code`
- Otherwise, export the `image_url`
- Both fields are included for maximum compatibility

## Example CSV

```csv
card_id,code,name,suit,rank,era,rarity,time_value,trader_value,image_code,image_url,description,status,is_active,current_target,qr_dark,qr_light
550e8400-e29b-41d4-a716-446655440000,ACE-SPDS-001,Ace of Spades,Spades,Ace,Modern,Legendary,100,High Value,a1,,The legendary ace card,active,true,https://example.com/redirect,#000000,#FFFFFF
,KING-HRTS-002,King of Hearts,Hearts,King,Vintage,Rare,75,,king_vintage,https://images.example.com/king.jpg,A vintage king card,active,true,,#8B0000,#FFE4E1
```

## Validation Rules

- **card_id**: Must be valid UUID (for updates)
- **code**: Must be unique, alphanumeric with hyphens
- **image_code**: Must exist in image_codes table
- **qr_dark/qr_light**: Must be valid hex colors (#RGB or #RRGGBB)
- **is_active**: Must be true/false or 1/0
- **time_value**: Must be non-negative integer

## Error Handling

Common import errors:
- Missing required fields for new cards
- Invalid card_id format
- Non-existent image_code
- Duplicate codes in same file
- Invalid color formats

## Compatibility

This format is used by:
- Card Export/Import (CSVOperations component)
- QR Generator Bulk Import (AdminQR page)
- Image Library mappings (ImageLibraryView component)
- Admin card management tools

All systems support both image_code and image_url for maximum flexibility.