// Demo fixtures. A small SaaS-style menu plus a keyword set built to surface
// every finding type, so the thesis is visible on first run with zero setup.
//
// Designed gaps:
//   - "Soluciones" / "Recursos"  -> ambiguous (vague nav words)
//   - "Novedades"                -> ghost (no matching demand)
//   - "API"  nested under "Empresa" -> misnested (belongs under Producto/Docs)
//   - "precio software seo", "integraciones", "guia seo tecnico" -> missing demand

export const DEMO_MENU = `Producto
  Funciones
  Soluciones
  API
Recursos
  Blog
  Casos de éxito
Empresa
  Nosotros
  Novedades
Contacto`;

export const DEMO_KEYWORDS = `precio software seo | 2400
funciones producto | 1300
integraciones | 1900
casos de exito | 600
guia seo tecnico | 1500
contacto soporte | 800
api documentacion | 1100
blog seo`;
