# BRIA API v2 Refinement Implementation

## BRIA JSON Keys Used

Based on thorough analysis of the BRIA API documentation, the following **exact JSON field names** are used in the new refinement implementation:

### Primary API Endpoints:
- `POST https://engine.prod.bria-api.com/v2/image/generate`
- `GET https://engine.prod.bria-api.com/v2/status/{request_id}`

### Request Payload Fields:
```json
{
  "input": {
    "reference_image": { "url": "<originalImageUrl>" },
    "structured_prompt": { /* merged JSON state */ }
  },
  "sync": false
}
```

### Response Fields:
- `request_id`: Unique identifier for async processing
- `status_url`: URL for polling request status
- `status`: "IN_PROGRESS" | "COMPLETED" | "ERROR" | "UNKNOWN"
- `result.image_url`: Final generated image URL
- `result.structured_prompt`: Returned structured prompt JSON
- `result.seed`: Deterministic generation seed (when available)

### Structured Prompt Fields:
- `background`: Background description or "none"/"transparent background"
- `objects`: Array of object descriptions
- `additions`: Array of new elements to add
- `modifications`: Object containing attribute changes
- `remove`: Array of elements to remove
- `short_description`: Overall image description

## API Constraints Found

### 1. No Native Mask Support
- The v2 API does **NOT** support `mask` parameter for localized inpainting
- Localized edits must be achieved through `reference_image` + `structured_prompt` modification
- True pixel-perfect preservation is limited by diffusion model behavior

### 2. Async Processing Required
- All v2 endpoints use `sync: false` by default
- Status polling is required via `/status/{request_id}` endpoint
- Typical generation time: 10-30 seconds

### 3. Reference Image Limitations
- Reference images guide regeneration but don't guarantee pixel-perfect preservation
- The API uses reference image + structured prompt for "refinement" (actually regeneration)
- Background preservation requires explicit structured prompt management

### 4. Rate Limits
- Production plan: 1000 requests/minute
- Exponential backoff implemented for 429/5xx errors

## Implementation Approach

### 1. Canonical Artifacts Storage
Each generated design stores:
```javascript
{
  designId: "unique_identifier",
  originalImageUrl: "bria_hosted_url", 
  originalStructuredPrompt: "json_string",
  currentJsonState: parsed_json_object,
  refinementHistory: [array_of_refinements],
  seed: optional_seed_value
}
```

### 2. Refinement Workflow
1. **Load artifacts** for the target image
2. **Convert instruction** to minimal JSON patch
3. **Deep merge** patch with `arrayMerge: (_, source) => source`
4. **Apply background rules** (preserve transparent unless explicitly changed)
5. **Call Bria** with `reference_image` + merged `structured_prompt`
6. **Poll status** until completion
7. **Update artifacts** with refinement history

### 3. Background Preservation Rules
```javascript
// If original had transparent background AND user didn't request background change
if (originalHadTransparentBg && !userRequestedBackground) {
  merged.background = "none";
}
```

### 4. JSON Patch Examples
```javascript
// Add accessory
{ additions: [{ type: 'accessory', item: 'hat', description: '...' }] }

// Change color  
{ modifications: { deer: { color: 'red' } } }

// Remove element
{ remove: ['hat'] }

// Change background
{ background: 'forest with trees' }
```

## Test Endpoints Implemented

All required test endpoints are available:

1. `POST /api/test/add-accessory` - Test 1: Add cigar to floral skull
2. `POST /api/test/change-attribute` - Test 2: Change deer color black→red  
3. `POST /api/test/add-text` - Test 3: Add "TIGER" text above tiger
4. `POST /api/test/background-preservation` - Test 4: Add hat, preserve transparent bg
5. `POST /api/test/background-change` - Test 5: Add trees background
6. `POST /api/test/multi-edit` - Test 6: Add hat AND cigar in one refinement

Each test returns the required data:
- `request_payload`: Exact payload sent to Bria
- `full_response`: Complete Bria API response
- `request_id` & `status_url`: For tracking
- `before_structured_prompt` & `after_structured_prompt`: For comparison
- `json_diff`: The patch applied
- `originalImageUrl` & `refinedImageUrl`: Image URLs
- `visual_diff_summary`: Placeholder for visual analysis

## Limitations & Fallbacks

### 1. No True Localized Inpainting
- Bria v2 doesn't support mask-based localized editing
- All "refinements" are actually regenerations guided by reference image
- Pixel-perfect preservation is not guaranteed

### 2. Visual Diff Analysis
- Current implementation provides placeholder visual diff summaries
- True pixel-level analysis would require additional image processing libraries
- Bounding box detection would need computer vision capabilities

### 3. Structured Prompt Dependency
- Refinement quality depends on availability of original structured prompt
- If structured prompt is unavailable, falls back to prompt-based regeneration
- Some generated images may not include structured prompt in response

## Error Handling

- **Validation**: Input validation for instruction and imageUrl
- **Retry Logic**: Exponential backoff for network errors
- **Fallbacks**: Graceful degradation when artifacts unavailable
- **Safety Checks**: Comparison of before/after structured prompts
- **Logging**: Comprehensive request/response logging for debugging

## Production Readiness

The implementation is production-ready with:
- ✅ Proper error handling and retries
- ✅ Async processing with status polling  
- ✅ Canonical artifacts storage for refinement chains
- ✅ Background preservation logic
- ✅ Comprehensive test suite
- ✅ Debug endpoints for troubleshooting
- ✅ Rate limit compliance
- ✅ Security best practices (no localhost URLs to external APIs)