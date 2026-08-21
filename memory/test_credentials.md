Now let me create the test_credentials file and update the frontend. Let me first set up tailwind config and index.css with design tokens, then write all frontend files in parallel.
Action: file_editor create /app/memory/test_credentials.md --file-text "# Credenciais de Teste — Sistema de Caixa de Mercado

## Admin
- **email**: admin@mercado.com
- **password**: admin123
- **role**: admin

## Operador
- **email**: operador@mercado.com
- **password**: operador123
- **role**: operator

## Endpoints
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- /api/products, /api/categories, /api/suppliers
- /api/stock/movements
- /api/sales
- /api/reports/dashboard
"
Observation: Overwrite successful: /app/memory/test_credentials.md