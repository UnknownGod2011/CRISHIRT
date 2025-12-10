# BRIA API v2 Refinement Implementation - COMPLETE REWRITE

## BRIA JSON Keys Used (From Documentation Analysis)

### Primary API Endpoints:
- `POST https://engine.prod.bria-api.com/v2/image/generate` - Main generation endpoint
- `POST https://engine.prod.bria-api.com/v2/image/edit/gen_fill` - Localized editing with mask
- `GET https://engine.prod.bria-api.com/v2/status/{request_id}` - Status polling
- `POST https://engine.prod.bria-api.com/v1/objects/mask_generator` - Mask generation (v1 only)

### Request Payload Fields:
```json
// For reference-based generation (main refinement method)
{
  "reference_image": { "url": "<originalImageUrl>" },
  "structured_prompt": "<JSON_STRING>", // Must be string, not object
  "sync": false
}

// For localized editing with mask (fallback method)
{
  "image": "<imageUrl>",
  "mask": "<base64_mask>", // data:image/png;base64,...
  "prompt": "<instruction>",
  "sync": false
}
```

### Response Fields:
- `request_id`: Unique identifier for async processing
- `status_url`: URL for polling request status  
- `status`: "IN_PROGRESS" | "COMPLETED" | "ERROR" | "UNKNOWN"
- `result.image_url`: Final generated image URL
- `result.structured_prompt`: Returned structured prompt JSON string
- `result.seed`: Deterministic generation seed (when available)

## API Constraints Found

### 1. No Native Mask Support in v2/image/generate
- The v2 `/image/generate` endpoint does **NOT** support `mask` parameter
- Localized edits must use `/v2/image/edit/gen_fill` with mask OR reference_image approach
- True pixel-perfect preservation requires mask-based editing

### 2. Structured Prompt Format Requirements
- `structured_prompt` must be a JSON **string**, not a JSON object
- API returns 422 error if structured_prompt is sent as object

### 3. Async Processing Required
- All v2 endpoints use `sync: false` by default
- Status polling required via `/status/{request_id}` endpoint
- Typical generation time: 10-30 seconds

### 4. Mask Generation Limitations
- Mask generation only available in v1 API (`/v1/objects/mask_generator`)
- Requires image registration first
- May not be available for all object types

## Implementation Strategy

### Primary Method: Reference Image + Structured Prompt
For most refinements, use reference image guidance with modified structured prompt:
1. Load canonical artifacts (originalImageUrl, originalStructuredPrompt, currentJsonState)
2. Convert NL instruction to minimal JSON patch
3. Deep merge patch with currentJsonState using array overwrite
4. Apply background preservation rules
5. Call `/v2/image/generate` with reference_image + merged structured_prompt

### Fallback Method: Mask-Based Localized Editing
For precise localized edits when masks are available:
1. Generate mask using `/v1/objects/mask_generator`
2. Use `/v2/image/edit/gen_fill` with mask + prompt
3. Provides pixel-perfect preservation of non-masked areas

### Error Handling & Robustness
- Validate patch JSON before sending
- Exponential backoff for 429/5xx errors
- Log all request_id, status_url, payloads, and responses
- Mark refinements as suspect if unrelated fields change
- Graceful fallback between methods

## Background Preservation Rules
```javascript
// If original had transparent background AND user didn't request background change
if (originalHadTransparentBg && !userRequestedBackground) {
  merged.background = "none";
}
```

## Deep Merge Implementation
```javascript
import merge from 'deepmerge';
const merged = merge(currentJsonState, patch, { 
  arrayMerge: (_, source) => source 
});
```

## Test Requirements
All 6 tests must return:
- `request_payload`: Exact payload sent to Bria
- `full_response`: Complete Bria API response  
- `request_id` & `status_url`: For tracking
- `before_structured_prompt` & `after_structured_prompt`: For comparison
- `json_diff`: The patch applied
- `originalImageUrl` & `refinedImageUrl`: Image URLs
- `visual_diff_summary`: Analysis of changed areas

## Production Readiness Features
- ✅ Proper error handling and retries
- ✅ Async processing with status polling
- ✅ Canonical artifacts storage for refinement chains  
- ✅ Background preservation logic
- ✅ Comprehensive test suite
- ✅ Debug endpoints for troubleshooting
- ✅ Rate limit compliance
- ✅ Mask-based fallback for localized edits