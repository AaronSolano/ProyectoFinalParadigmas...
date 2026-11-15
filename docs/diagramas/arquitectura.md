# Arquitectura

## 1. Vista de despliegue y observabilidad

Dos modos de ejecución con las mismas imágenes de Docker Hub: **desplegado** (Vercel + Render + Supabase) y **portátil** (Docker Compose en cualquier equipo con Git y Docker). La conexión a la base se elige solo con `DATABASE_URL`; el almacenamiento de imágenes, con una variable de entorno.

```mermaid
flowchart LR
    subgraph Clientes
        U["Navegador<br/>(creador, anfitrión, participante)"]
        X["Cliente externo<br/>apps/external-client<br/>(consume REST de la API)"]
    end

    subgraph Desplegado["Modo desplegado"]
        direction LR
        V["Frontend web React/Vite<br/>Vercel"]
        subgraph Render["Render (Web Services, imagen de Docker Hub)"]
            A["auth-api<br/>NestJS"]
            K["kahoot-api<br/>NestJS + Socket.IO<br/>(1 instancia)"]
        end
        subgraph Supabase["Supabase"]
            DBA[("PostgreSQL<br/>BD auth")]
            DBK[("PostgreSQL<br/>BD kahoot")]
            ST[["Supabase Storage<br/>(imágenes)"]]
        end
    end

    subgraph Portatil["Modo portátil: Docker Compose"]
        direction LR
        CW["web"]
        CA["auth-api"]
        CK["kahoot-api"]
        CP[("PostgreSQL<br/>auth + kahoot")]
        VOL[["Volumen persistente<br/>(imágenes en disco)"]]
        CW --- CA
        CW --- CK
        CA --> CP
        CK --> CP
        CK --> VOL
    end

    U -->|HTTPS| V
    V -->|REST: registro y login| A
    V -->|REST + WebSocket con JWT| K
    X -->|REST con JWT| K
    X -->|REST: login| A
    K -.->|valida JWT con clave pública / secreto<br/>sin consultar la BD auth| A
    A -->|DATABASE_URL, SSL, pooler| DBA
    K -->|DATABASE_URL, SSL, pooler| DBK
    K -->|ImageStorage: Supabase| ST

    subgraph Obs["Observabilidad"]
        direction LR
        OC["OpenTelemetry Collector"]
        P["Prometheus<br/>métricas"]
        T["Tempo<br/>trazas"]
        L["Loki<br/>logs"]
        G["Grafana<br/>paneles aprovisionados"]
        OC --> P
        OC --> T
        OC --> L
        P --> G
        T --> G
        L --> G
    end

    A -->|OTLP| OC
    K -->|OTLP| OC
    CA -.->|OTLP| OC
    CK -.->|OTLP| OC
```

Notas:
- **Frontend (Vercel):** sitio estático; las URLs de ambas APIs y CORS se configuran por variables de entorno. Vercel no mantiene WebSockets, por eso no aloja el backend.
- **APIs (Render):** cada una es un Web Service que despliega su imagen de Docker Hub. `kahoot-api` corre en **una sola instancia**: el estado de la partida vive en memoria y se persiste en la base en cada transición. Los planes gratuitos se duermen; la demostración usa un plan que no duerma.
- **Base de datos:** cada servicio usa su propia base lógica (`auth`, `kahoot`). En Supabase se accede por el pooler con SSL; en Compose es un contenedor PostgreSQL con el mismo motor y versión.
- **Imágenes:** la interfaz `ImageStorage` tiene dos implementaciones: **disco** con volumen persistente (modo portátil u hosts con volumen) y **Supabase Storage** (Render gratuito, sin disco). `kahoot-api` siempre es la dueña de las imágenes y de su URL pública.
- **Autenticación entre servicios:** el JWT de `auth-api` lleva la audiencia de `kahoot-api`, que lo valida localmente (firma y `aud`) sin acceder a la base `auth`.
- **Observabilidad:** ambas APIs exportan por OTLP al Collector. En Compose, Prometheus, Tempo, Loki y Grafana corren localmente; en el despliegue se exporta a Grafana Cloud (nivel gratuito) o a un Grafana propio, sin cambiar el código.

## 2. Arquitectura N-Capas de cada API

Se aplica a `auth-api` y a `kahoot-api` (monolito modular por API, módulos por contexto: `auth`/`profiles`; `quizzes`/`sessions`/`game`).

```mermaid
flowchart TB
    subgraph PRES["Capa de presentación"]
        direction LR
        CTRL["Controladores REST<br/>DTOs + validación"]
        GW["Gateway WebSocket (Socket.IO)<br/>solo kahoot-api"]
        GRD["Guardias de autenticación<br/>y filtros de errores"]
    end

    subgraph APP["Capa de aplicación (servicios / casos de uso)"]
        direction LR
        UC["Servicios de aplicación<br/>QuizService, SessionService,<br/>GameService, AuthService"]
        PERM["Comprobación de permisos<br/>(propiedad, rol anfitrión)"]
        TMR["Orquestación de temporizadores<br/>(reloj del servidor)"]
    end

    subgraph DOM["Capa de dominio (reglas puras)"]
        direction LR
        ENT["Entidades y objetos de valor<br/>Quiz, Question, Session, Participant, Answer"]
        RULES["GameStateMachine, ScoreCalculator,<br/>SessionCodeGenerator"]
        PORTS["Puertos (interfaces)<br/>QuizRepository, SessionRepository,<br/>ImageStorage, Clock"]
    end

    subgraph DATA["Capa de acceso a datos / infraestructura"]
        direction LR
        REPO["Repositorios (implementan los puertos)<br/>ORM + SQL, transacciones"]
        IMG["DiskImageStorage<br/>SupabaseImageStorage"]
        DB[("PostgreSQL")]
    end

    CTRL --> UC
    GW --> UC
    GRD -.-> CTRL
    GRD -.-> GW
    UC --> PERM
    UC --> TMR
    UC --> ENT
    UC --> RULES
    UC --> PORTS
    REPO -. implementa .-> PORTS
    IMG -. implementa .-> PORTS
    REPO --> DB
```

### Regla de dependencia

Las dependencias de código solo apuntan **hacia abajo y hacia el dominio**:

1. **Presentación** depende de **aplicación**. Nunca llama a repositorios ni contiene reglas de negocio.
2. **Aplicación** depende de **dominio** y de los **puertos** (interfaces) declarados en el dominio. Orquesta transacciones, permisos y temporizadores.
3. **Dominio** no depende de ninguna otra capa ni de frameworks: sin HTTP, sin Socket.IO, sin ORM, sin reloj del sistema directo (se inyecta `Clock`). Por eso las reglas de puntaje, tiempo y respuesta única se prueban con pruebas unitarias puras.
4. **Acceso a datos** implementa los puertos del dominio (inversión de dependencia). Los repositorios son la **única** capa que habla con la base de datos y con el almacenamiento de imágenes.

| Capa | Puede usar | No puede usar |
|---|---|---|
| Presentación | Aplicación, DTOs | Dominio directamente para decidir reglas, repositorios, ORM |
| Aplicación | Dominio, puertos | Controladores, gateway, ORM concreto |
| Dominio | Solo el propio dominio | HTTP, WebSocket, ORM, `Date.now()` directo |
| Acceso a datos | Puertos del dominio, ORM, SDK de Supabase Storage | Presentación, servicios de aplicación |

Reglas de seguridad ubicadas por capa: la autenticación (JWT, handshake WS) se verifica en presentación; la **propiedad** del cuestionario y la identidad del anfitrión se comprueban en aplicación; la **respuesta correcta** se oculta antes del cierre en aplicación al construir los eventos; el servidor es la única fuente de tiempo y estado.
