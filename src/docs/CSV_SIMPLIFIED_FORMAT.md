# Simplified CSV Import Format

## Overview
The simplified CSV format is designed for bulk card creation with minimal manual work. The system automatically generates card codes, IDs, and claim tokens.

## Simplified Format (Recommended for New Cards)

### Required Fields
```csv
name,suit,rank,era
Legendary Ace,Spades,Ace,Vintage
King of Hearts,Hearts,King,Modern
Queen of Diamonds,Diamonds,Queen,Classic
```

### Optional Fields
```csv
name,suit,rank,era,rarity,time_value,image_code,description
Legendary Ace,Spades,Ace,Vintage,Legendary,100,a1,The legendary ace
King of Hearts,Hearts,King,Modern,Rare,75,a2,A powerful king
```

## Auto-Generated Fields

The following fields are **automatically generated** by the system:

- **card_id**: UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **code**: Unique card code (e.g., `SPA-ACE-001`, `HRT-KING-002`)
- **claim_token**: Secure 22-character token for card claiming
- **print_batch_id**: Automatically set to the currently selected batch (if any)

## Code Generation Pattern

Format: `{SUIT-3LETTER}-{RANK}-{SEQUENCE}`

Examples:
- `SPA-ACE-001` (Spades, Ace, sequence 1)
- `HRT-KING-002` (Hearts, King, sequence 2)  
- `DIA-QUEEN-003` (Diamonds, Queen, sequence 3)
- `CLU-JACK-004` (Clubs, Jack, sequence 4)

Sequence numbers increment automatically within each batch.

## Batch Assignment

When importing with a print batch selected:
- All cards are automatically assigned to that batch
- Sequence numbers are batch-specific
- Cards can be moved between batches later

## Full Format (For Updates)

If you need to update existing cards or have more control, use the full format:

```csv
card_id,code,name,suit,rank,era,rarity,time_value,trader_value,image_code,image_url,description,status,is_active,current_target,qr_dark,qr_light
550e8400-e29b-41d4-a716-446655440000,SPA-ACE-001,Legendary Ace,Spades,Ace,Vintage,Legendary,100,Elite,a1,,The legendary ace,active,true,https://example.com,#000000,#FFFFFF
```

- **card_id**: If provided, updates existing card
- **code**: Required for new cards (or leave blank for auto-generation)

## Field Definitions

### Required Fields (Simplified Format)
- **name**: Card name (e.g., "Legendary Ace")
- **suit**: Card suit (e.g., "Spades", "Hearts", "Diamonds", "Clubs")
- **rank**: Card rank (e.g., "Ace", "King", "Queen", "Jack", "2" through "10")
- **era**: Card era (e.g., "Vintage", "Modern", "Classic")

### Optional Fields (Simplified Format)
- **rarity**: Card rarity level (e.g., "Common", "Rare", "Legendary")
- **time_value**: Numeric TIME token value (default: 0)
- **trader_value**: Text description of trade value (e.g., "Elite", "Premium")
- **image_code**: Short code referencing image library (e.g., "a1", "hero_001")
- **description**: Text description of the card

### Auto-Generated (Don't Include)
- **card_id**: Generated automatically
- **code**: Generated automatically (unless full format with manual code)
- **claim_token**: Generated automatically
- **print_batch_id**: Set based on currently selected batch

## Examples

### Example 1: Minimal CSV (Required Fields Only)
```csv
name,suit,rank,era
Ace of Spades,Spades,Ace,Vintage
King of Hearts,Hearts,King,Modern
Queen of Diamonds,Diamonds,Queen,Classic
Jack of Clubs,Clubs,Jack,Retro
```

Result: System generates codes like `SPA-ACE-001`, `HRT-KING-002`, `DIA-QUEEN-003`, `CLU-JACK-004`

### Example 2: Complete CSV (With Optional Fields)
```csv
name,suit,rank,era,rarity,time_value,image_code,description
Legendary Ace,Spades,Ace,Vintage,Legendary,100,a1,The most valuable card
Mythic King,Hearts,King,Modern,Mythic,150,a2,A king among kings
Divine Queen,Diamonds,Queen,Classic,Divine,200,a3,Radiant and powerful
Epic Jack,Clubs,Jack,Retro,Epic,75,a4,A jack of all trades
```

### Example 3: Mixed Batch Import
When importing to "First Print - January 2025" batch:
```csv
name,suit,rank,era
Card A,Spades,2,Modern
Card B,Hearts,3,Modern  
Card C,Diamonds,4,Modern
```

Result: All three cards assigned to "First Print - January 2025" with codes `SPA-2-001`, `HRT-3-002`, `DIA-4-003`

## Import Workflow

1. **Select Print Batch** (optional but recommended)
   - Choose which batch to import cards into
   - Or select "Unassigned Cards" to import without batch

2. **Prepare CSV File**
   - Use simplified format with only essential fields
   - Or export existing cards as a template

3. **Upload CSV**
   - Click "Import CSV" button
   - Select your CSV file
   - System detects format automatically

4. **Review Preview**
   - Check cards that will be created
   - Verify auto-generated codes look correct
   - Confirm batch assignment

5. **Execute Import**
   - Click "Import" to create cards
   - System generates codes, IDs, and tokens
   - Cards appear in selected batch

## Best Practices

✅ **DO:**
- Use simplified format for bulk card creation
- Export existing cards to use as a template
- Select a batch before importing
- Use image_code for referencing library images
- Include optional fields when available

❌ **DON'T:**
- Include card_id for new cards (leave blank or omit column)
- Include code for new cards if using simplified format
- Manually create claim_tokens
- Mix full and simplified formats in the same file

## Validation

The system validates:
- **Required fields**: name, suit, rank, era must be present
- **Code uniqueness**: Auto-generated codes are always unique
- **Image codes**: Validated against image library
- **Batch existence**: Selected batch must exist and be active
- **Data types**: time_value must be numeric, is_active must be boolean

## Error Handling

If validation fails:
- Specific error messages indicate which rows have issues
- Valid rows are still imported
- Invalid rows are skipped with detailed error log
- Import summary shows created/failed counts

## Migrating from Old Format

Old format:
```csv
card_id,code,name,suit,rank,era,rarity,time_value,trader_value,image_code,image_url,description,status,is_active,current_target,qr_dark,qr_light
,MANUAL-001,Card Name,Spades,Ace,Vintage,Rare,100,Elite,a1,,Description,active,true,,,
```

New simplified format:
```csv
name,suit,rank,era,rarity,time_value,image_code,description
Card Name,Spades,Ace,Vintage,Rare,100,a1,Description
```

Much simpler! System handles code generation automatically.
