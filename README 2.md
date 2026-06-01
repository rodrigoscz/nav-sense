<div align="center">

<img src="public/nova-mark.png" width="150" alt="Nova" />

# nav-sense

**La navegacion es una decision de lenguaje, no de gusto.**

Pega tu menu y tus keywords. Te muestro el gap entre como esta armada la nav y como la gente busca.

`English:` paste your site menu and target keywords, get the gap between how navigation is built and how people actually search.

</div>

---

## La tesis

Un menu parece una decision de diseño. No lo es.

Cada label es una apuesta sobre como tu usuario nombra lo que busca. Si la nav dice "Soluciones" y la gente busca "precio software seo", no tenes un problema de UX ni de SEO por separado: tenes un problema de **lenguaje**. Tecnico, contenido y UX son la misma conversacion.

No dejaria a un LLM decidir la arquitectura de un menu sin keyword research. nav-sense existe para que lo compruebes vos mismo: pegas lo que tenes, y ves el gap.

## Que hace

Toma dos cosas:

1. **Tu menu / arquitectura de informacion** (texto indentado o JSON).
2. **Tus keywords / entidades** objetivo (una por linea, con volumen opcional).

Y te devuelve:

- **Gap report**: una tabla con cuatro tipos de desajuste.
- **Propuesta de IA reordenada**: el arbol corregido.
- **Changelog markdown**: los cambios sugeridos, listos para copiar y discutir.

### Los cuatro gaps que detecta

| Tipo | Que significa |
|------|---------------|
| `demanda sin label` | La gente busca algo que tu nav no nombra. Demanda sin puerta de entrada. |
| `label sin demanda` | Un label que ocupa lugar pero no capta busquedas. Candidato a fusionar o sacar. |
| `label ambiguo` | "Recursos", "Soluciones": palabras genericas que el usuario no puede predecir. |
| `mal anidado` | Un label que cuelga del padre equivocado segun su intencion. |

Arriba de todo, un numero: **cobertura de demanda**, cuanta de tu demanda objetivo tiene hoy un label claro.

## Demo en 30 segundos

```bash
pnpm install
pnpm dev
```

Abri el navegador. La app arranca con un menu demo y un set de keywords demo ya cargados, asi que ves el gap report al instante. Tocá **Analizar gap**, leé la tabla, mirá la propuesta y copiá el changelog.

Despues borralo y pega lo tuyo.

## Como pegar tus datos

**Menu** (indentado, los espacios marcan jerarquia):

```
Producto
  Funciones
  API
Recursos
  Blog
Contacto
```

O JSON:

```json
[{ "label": "Producto", "children": [{ "label": "API" }] }]
```

**Keywords** (una por linea, volumen opcional despues de `|`):

```
precio software seo | 2400
integraciones | 1900
guia seo tecnico
```

Sin volumen, ranquea por calidad de match. Con volumen, prioriza por demanda.

## Privacidad y costo

Todo corre en tu navegador. No se manda nada a ningun lado, no hay backend, no hay tracking.

**DataForSEO** queda como capa **opcional** de enriquecimiento (BYO-key, cache, modo fixtures por defecto). El MVP no la cablea: la corrida por defecto **no gasta un solo credito**.

## Stack

- **Astro + TypeScript**, render estatico, logica client-side.
- Motor de matching semantico propio (tokenizacion ES/EN, stemming liviano, scoring por cobertura de intencion). Sin dependencias de runtime mas alla de Astro.
- Tests del motor con el runner nativo de Node.

```bash
node --import tsx --test test/*.test.ts
```

## Que NO hace (todavia)

- No crawlea ni scrapea tu sitio. Vos pegas la estructura.
- No usa embeddings. El matching es lexico con stemming (suficiente para el MVP). Embeddings via LLM BYO-key son el proximo paso.
- No es multi-tenant ni tiene login. Es una herramienta, no un SaaS.

## Paleta

Tierra / otoñal, parte de la identidad de la suite.

- Arena `#E7CDA6` · Marron `#7A5230` · Terracota `#C46A2B` · Tinta `#2E2117`

---

<div align="center">

Parte de la suite open-source de **[@rodrigoscz](https://github.com/rodrigoscz)**.

Tecnico, contenido y UX. Parecen distintas. No lo son.

</div>
