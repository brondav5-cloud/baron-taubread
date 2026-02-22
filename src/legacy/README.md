# Legacy / Deprecated Code

This folder contains deprecated code that is no longer used by the active application flow.

## Contents

### useExcelUpload.ts

- **Deprecated**: Legacy Excel upload hook
- **Reason**: Uses non-existent Supabase tables (`staging_sales`, `data_uploads`) and RPC (`process_staging_sales`) that are not defined in the current schema
- **Replacement**: The active upload flow uses `useDataUpload` → POST `/api/upload` → `stores`, `products`, `store_products`, `uploads`, etc.

### ExcelUpload.tsx

- **Deprecated**: Legacy Excel upload UI component
- **Reason**: Orphaned component; not imported or rendered by any active route or page
- **Depends on**: `useExcelUpload` (above)

## Active Upload Flow (DO NOT MODIFY)

- `src/hooks/useDataUpload.ts`
- `src/app/api/upload/route.ts`
- `src/app/dashboard/upload/page.tsx`
